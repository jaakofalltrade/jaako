import { loadEnvLocal } from "./loadEnv.mjs";
import { openDatabase, resolveDatabase } from "./dbClient.mjs";
import { spotifyAccessToken } from "./spotifyShelf.mjs";

/**
 * Puts the artwork back on cards that were dealt before there was a column for it.
 *
 *     pnpm cards:backfill --dry     say what would change, write nothing
 *     pnpm cards:backfill           write it
 *
 * WHY THERE ARE COVERLESS CARDS AT ALL. `002_deepcuts.sql` recorded what a card WAS -
 * title, artist, rung, play count - which is everything the two figures at the top of
 * the page need. The collection tab renders the card FACE, so `003` added `album_art`,
 * `track_url` and `shiny`. Every card dealt before that migration has none of the three,
 * and the binder draws them as the quiet hatched square a track with no artwork gets.
 * Measured on the development database: 80 of 113 cards.
 *
 * TWO OF THE THREE CAN BE RECOVERED AND ONE CANNOT. The artwork and the link are facts
 * about a track that Spotify will still answer for, keyed on the `track_uri` every row
 * already has. `shiny` is a coin flipped once inside drawPack and written nowhere else,
 * so those cards stay plain - which is what they already show, and the honest answer
 * rather than re-rolling a card somebody has already pulled.
 *
 * IT ONLY EVER FILLS NULLS. `where album_art is null` is on every update, so a card that
 * already has a cover is never touched and a second run does nothing. That is what makes
 * this safe to run twice and safe to run half way.
 *
 * THE HOST CHECKS ARE THE APP'S, COPIED RATHER THAN IMPORTED. src/server/spotify/mappers
 * is TypeScript behind the `@/` alias and carries `server-only`, so a plain node script
 * cannot reach it. What it can do is apply the same rule: art must be on i.scdn.co and a
 * link must be on open.spotify.com, because these strings are about to be written into a
 * table that a page renders as an <img src> and an <a href>. A third party is one network
 * hop away and this is the last place to check.
 */

loadEnvLocal();

/**
 * ONE TRACK PER REQUEST, AND THAT IS NOT THE OBVIOUS CHOICE. /v1/tracks?ids= takes fifty
 * ids at a time and would turn 49 lookups into one, which is what this was written to do.
 * Measured against the live API with this app's own token:
 *
 *     403  GET /v1/tracks?ids=4GuZMzKXJSoWhwHUqRa0fm      {"error":{"status":403}}
 *     200  GET /v1/tracks/4GuZMzKXJSoWhwHUqRa0fm
 *     200  GET /v1/me
 *
 * The token is fine and the id is fine; the BATCH endpoint is refused to an app in
 * development mode while the single-track one is not. So the fan-out is the price of the
 * platform, not of the design - and it is a price worth paying once, for a script that
 * runs when a migration adds a column.
 *
 * Five at a time, which is the same politeness the pack scorer applies to last.fm.
 */
const LOOKUP_CONCURRENCY = 5;

/** Matching src/constants/spotify.ts. */
const ART_HOST = "i.scdn.co";
const LINK_HOST = "open.spotify.com";
const PREFERRED_ART_WIDTH = 300;

const bail = (message) => {
  console.error(message);
  process.exit(1);
};

/**
 * A URL, if it is on the host we will render it from, and null otherwise.
 *
 * Parsed rather than compared as a string: `javascript:` and `data:` URLs parse with an
 * empty hostname, so they fail the comparison without needing a scheme check of their
 * own, and "evilscdn.co" cannot pass a test that startsWith would let through.
 */
const fromHost = (url, host) => {
  if (!url) return null;
  try {
    return new URL(url).hostname === host ? url : null;
  } catch {
    return null;
  }
};

/** The cover nearest 300px, which is what the app picks and therefore what it caches. */
const pickArt = (images) => {
  if (!images?.length) return null;
  const nearest = [...images].sort(
    (a, b) =>
      Math.abs((a.width ?? 0) - PREFERRED_ART_WIDTH) -
      Math.abs((b.width ?? 0) - PREFERRED_ART_WIDTH)
  )[0];
  return fromHost(nearest?.url, ART_HOST);
};

const chunk = (values, size) => {
  const out = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
};

const main = async () => {
  const dry = process.argv.includes("--dry");

  /* No DATABASE_URL is the local database rather than an error now, so this reaches
     whichever one the app would. Printed for the same reason wipe-packs prints it. */
  const destination = resolveDatabase();
  console.log(`database: ${destination.description}`);

  const database = await openDatabase(destination, { as: "pnpm cards:backfill" });

  /* try/finally so the handle is given up on every path that unwinds, not just the two
     that reach the end. spotifyAccessToken() throws on a clone with no credentials, which
     is now a likely shape - a working local database and no Spotify - and that used to
     exit on an unhandled rejection with the database still open. wipe-packs.mjs and
     db-which.mjs are both already written this way.

     bail() is the one path this does NOT cover, because process.exit runs no finally. The
     exit hook in pgdataLock.mjs is what releases the lock there; the handle goes with the
     process. */
  try {
    /* DISTINCT, because one song pulled by five people is five rows and one lookup. On the
       development database that is 80 rows and 47 tracks. Rows whose uri is empty are a
       local file Spotify has no id for; there is nothing to ask about, so they are left
       alone rather than counted as failures. */
    const { rows: pending } = await database.query(`
      select distinct track_uri
      from pack_card
      where album_art is null and track_uri <> ''
    `);

    const { rows } = await database.query(
      "select count(*)::int as n from pack_card where album_art is null and track_uri <> ''"
    );

    if (pending.length === 0) {
      console.log("\nNothing to backfill: every card with a uri already has its artwork.\n");
      return;
    }

    console.log(
      `\n${rows[0].n} card${rows[0].n === 1 ? "" : "s"} with no artwork, across ` +
        `${pending.length} distinct track${pending.length === 1 ? "" : "s"}.\n`
    );

    const token = await spotifyAccessToken();

    /* `spotify:track:<id>` down to the id, which is the form /v1/tracks wants. Anything
       that is not that shape is skipped rather than sent: a malformed id in a batch of
       fifty fails the whole batch. */
    const ids = pending
      .map((row) => /^spotify:track:([A-Za-z0-9]{22})$/.exec(row.track_uri)?.[1])
      .filter(Boolean);

    const skipped = pending.length - ids.length;
    if (skipped) console.log(`  ${skipped} skipped: not a Spotify track uri.\n`);

    const found = new Map();
    let refused = 0;

    for (const batch of chunk(ids, LOOKUP_CONCURRENCY)) {
      await Promise.all(
        batch.map(async (id) => {
          const response = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          /* A deleted or region-locked track is a 404 on this endpoint rather than an
             error worth stopping for, so one bad row does not cost the whole run. A 401 is
             different: the token is wrong and every remaining request will fail the same
             way, so that one bails. */
          if (response.status === 401) bail("401 from Spotify. Re-mint with: pnpm token:read");
          if (!response.ok) {
            refused += 1;
            return;
          }

          const track = await response.json();
          if (!track?.uri) return;

          found.set(track.uri, {
            art: pickArt(track.album?.images),
            url: fromHost(track.external_urls?.spotify, LINK_HOST),
          });
        })
      );
    }

    if (refused) console.log(`  ${refused} refused by Spotify.\n`);

    let filled = 0;
    let artless = 0;
    let missing = 0;

    for (const { track_uri } of pending) {
      const face = found.get(track_uri);

      if (!face) {
        missing += 1;
        continue;
      }

      /* A track Spotify has but which genuinely has no cover. Writing null would leave the
         row indistinguishable from one this script has never seen, so it is counted and
         left for a later run to try again - the cost of that is one lookup. */
      if (!face.art) {
        artless += 1;
        continue;
      }

      if (dry) {
        filled += 1;
        continue;
      }

      /* `album_art is null` is the guard that makes this idempotent and re-runnable: a row
         filled by an earlier pass, or by a rip that happened while this was running, is not
         overwritten. track_url is set in the same statement because the two columns arrived
         in the same migration and are empty in exactly the same rows. */
      await database.query(
        `update pack_card
         set album_art = $1, track_url = $2
         where track_uri = $3 and album_art is null`,
        [face.art, face.url ?? "", track_uri]
      );

      filled += 1;
    }

    console.log(dry ? "  DRY RUN, nothing written.\n" : "");
    console.log(`  ${filled} track${filled === 1 ? "" : "s"} ${dry ? "would be" : ""} filled`);
    if (artless) console.log(`  ${artless} known to Spotify but with no cover`);
    if (missing) console.log(`  ${missing} Spotify would not return`);
    console.log("");

    if (!dry) {
      const { rows: left } = await database.query(
        "select count(*)::int as n from pack_card where album_art is null and track_uri <> ''"
      );
      console.log(`  ${left[0].n} card${left[0].n === 1 ? "" : "s"} still without artwork.\n`);
    }
  } finally {
    await database.close();
  }
};

/* The message, not the stack. The same ending wipe-packs.mjs and db-which.mjs have, and
   it matters more now that "there is no local database yet" is an ordinary thing for this
   script to say to somebody on a fresh clone. */
main().catch((error) => {
  console.error("backfill failed:", error.message);
  process.exit(1);
});
