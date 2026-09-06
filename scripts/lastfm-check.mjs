import { loadEnvLocal } from "./loadEnv.mjs";

/**
 * Reports how well Spotify's track names match last.fm's, on real playlists.
 *
 *     pnpm lastfm:check                  list the public playlists and their ids
 *     pnpm lastfm:check <playlist id>    score one and report what matched
 *
 * WHY THIS EXISTS. The join between the two catalogues is two strings, and
 * src/utils/trackMatch.ts is a set of rules about reshaping them: take the primary
 * artist rather than every credit, strip Spotify's version labels. Those rules are
 * pinned by unit tests, which prove they do what they say - and prove nothing at all
 * about whether last.fm agrees. The only way to know the match rate is to ask last.fm
 * about a real playlist and count.
 *
 * It also prints the tier spread, which is the other thing that cannot be known without
 * data. DEEPCUT_TIER_FLOOR is anchored for stadium-scale music; if a playlist comes back
 * as five unheards, the floors want moving and this is what says so.
 *
 * IT GOES THROUGH THE APP'S OWN ROUTE rather than calling last.fm itself, deliberately.
 * A second implementation of the matching here would be a second thing to keep in step,
 * and it would happily report a match rate the site does not actually get. So this needs
 * `pnpm dev` running, and what it measures is the real code path.
 *
 * Read-only, and it spends the same caches the page does.
 */

loadEnvLocal();

const SITE = process.env.CHECK_ORIGIN ?? "http://localhost:3000";

const bail = (message) => {
  console.error(message);
  process.exit(1);
};

/* ---------------- listing, which does not need the dev server ---------------- */

const listPlaylists = async () => {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } =
    process.env;

  if (!id || !secret || !refresh) bail("Spotify credentials are not set. See .env.local.");

  const auth = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });

  if (!auth.ok) bail(`Spotify token refresh failed: ${auth.status}`);
  const { access_token } = await auth.json();

  const me = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!me.ok) bail(`GET /me failed: ${me.status}`);
  const owner = (await me.json()).id;

  const found = [];
  for (let page = 0; page < 10; page += 1) {
    const response = await fetch(
      `https://api.spotify.com/v1/me/playlists?limit=50&offset=${page * 50}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (response.status === 403) {
      bail(
        "403 from /me/playlists. The read token is missing playlist-read-private.\n" +
          "Re-mint it with: pnpm token:read"
      );
    }
    if (!response.ok) bail(`GET /me/playlists failed: ${response.status}`);

    const body = await response.json();
    const items = body.items ?? [];
    found.push(...items);

    if (!body.next || items.length < 50) break;
  }

  const mine = found
    .filter((playlist) => playlist?.owner?.id === owner && playlist?.public === true)
    // Same de-duplication the app does: offset paging over this collection repeats itself.
    .filter((playlist, index, all) => all.findIndex((p) => p.id === playlist.id) === index)
    .sort((a, b) => (b.items?.total ?? 0) - (a.items?.total ?? 0));

  console.log(`\n${mine.length} public playlists, biggest first:\n`);
  for (const playlist of mine.slice(0, 20)) {
    console.log(`  ${playlist.id}  ${String(playlist.items?.total ?? 0).padStart(4)}  ${playlist.name}`);
  }
  console.log(`\nThen:  pnpm lastfm:check ${mine[0]?.id ?? "<id>"}\n`);
};

/* ---------------- scoring, which does ---------------- */

const checkPlaylist = async (playlistId) => {
  let response;
  try {
    response = await fetch(`${SITE}/api/lab/deepcuts/pack?id=${encodeURIComponent(playlistId)}`);
  } catch {
    bail(`Could not reach ${SITE}. Is "pnpm dev" running?`);
  }

  if (response.status === 404) bail("That playlist is not on the shelf: not public, or not yours.");
  if (!response.ok) bail(`Route answered ${response.status}.`);

  const pack = await response.json();

  console.log(`\n${pack.name}  (${pack.track_count} tracks, ${pack.tracks.length} scored)\n`);

  if (!pack.scored) {
    bail(
      "last.fm is not switched on: LASTFM_API_KEY is empty.\n" +
        "Get a key at https://www.last.fm/api/account/create, put it in .env.local,\n" +
        "and restart the dev server."
    );
  }

  const matched = pack.tracks.filter((track) => track.plays !== null);
  const missed = pack.tracks.filter((track) => track.plays === null);
  const rate = pack.tracks.length ? Math.round((matched.length / pack.tracks.length) * 100) : 0;

  console.log(`  matched  ${matched.length}/${pack.tracks.length}  (${rate}%)\n`);

  const tiers = {};
  for (const track of matched) tiers[track.tier] = (tiers[track.tier] ?? 0) + 1;

  /* Listed commonest first, matching DEEPCUT_LADDER. Spelled out rather than derived
     from the response, because a rung with no tracks on this playlist is exactly the
     interesting case and would be missing from the data. Keep in step with the enum. */
  console.log("  tiers:");
  for (const tier of [
    "ANTHEM",
    "CHART",
    "ROTATION",
    "ALBUM",
    "DEEPCUT",
    "UNHEARD",
    "GHOST",
    "LOST",
  ]) {
    const count = tiers[tier] ?? 0;
    console.log(`    ${tier.padEnd(9)} ${String(count).padStart(3)}  ${"#".repeat(count)}`);
  }

  /* THE UNMATCHED LIST IS THE POINT OF THE WHOLE SCRIPT. Every line here is either a
     track last.fm genuinely does not have, or a rule missing from trackMatch.ts - and
     which of the two it is, is obvious from the title. */
  if (missed.length) {
    console.log(`\n  unmatched (${missed.length}):`);
    for (const track of missed.slice(0, 25)) {
      console.log(`    ${track.artist}  ${String.fromCharCode(0x2014)}  ${track.title}`);
    }
    if (missed.length > 25) console.log(`    ... and ${missed.length - 25} more`);
  }

  console.log("");
};

const [playlistId] = process.argv.slice(2);

if (playlistId) await checkPlaylist(playlistId);
else await listPlaylists();
