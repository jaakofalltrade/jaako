import "server-only";
import { COLLECTION_LIMIT, DEEPCUT_LADDER } from "@/constants";
import { DeepcutTier } from "@/models";
import type { CollectedCard, DeepcutsStats, MostOpenedPack, RarestCard } from "@/models";
import { isEnumValue } from "@/utils/enum";
import { hasDatabase, sql } from "@/server/db";

/**
 * Every query /lab/deepcuts makes against Neon, and only those.
 *
 * The same shape as src/server/suggest/store.ts and for the same reason: nothing else
 * in the app writes SQL, so swapping the backing store stays a one-file change.
 *
 * Three things live here. `stats` answers the two figures beside the title, `recordRip`
 * writes down an opened pack, and `cardsFor` reads one visitor's collection back out.
 *
 * READS DEGRADE, AS EVERYWHERE ELSE. A database that cannot be reached leaves the two
 * lines reading "nothing yet" and the collection empty, rather than taking the page
 * down - which is the same answer an empty table gives. That collapse is deliberate: the
 * distinction between "nobody has opened a pack" and "we could not ask" is real, and it
 * is not a distinction worth putting in front of a visitor on a page about trading cards.
 *
 * WRITES DO NOT DEGRADE, and the split is the repo's standing rule. `recordRip` throws
 * and lets its caller decide what a failure costs; only the reads swallow.
 */

/** Where a rung sits on the ladder, 0 for the commonest. See pack_card.tier_rank. */
const tierRank = (tier: DeepcutTier): number => DEEPCUT_LADDER.indexOf(tier);

/**
 * Turns the text in pack_card.tier back into a rung.
 *
 * Checked rather than cast. The column is text so that adding a rung is a deploy rather
 * than a migration, and the cost of that is a row written by an older deploy naming a
 * rung this one no longer has. Narrowing rather than asserting is what keeps such a row
 * out of the render instead of putting a string the legend cannot explain on the page.
 */
const isTier = isEnumValue(DeepcutTier);

/**
 * The two figures beside the title, plus the total.
 *
 * THREE QUERIES RATHER THAN ONE, and they are cheap enough that joining them into a
 * single statement would buy nothing but a harder query to read. Two of them touch an
 * index and the third is a count over a table that is empty today and will be small for
 * a very long time.
 */
const stats = async (): Promise<DeepcutsStats> => {
  const empty: DeepcutsStats = { most_opened: null, rarest_card: null, total_rips: 0 };

  if (!hasDatabase()) return empty;

  try {
    const [opened, rarest, total] = await Promise.all([
      /* The playlist ripped most often. Ties break on the id, which is arbitrary and
         stable - without the second key, two playlists on the same count would swap
         places between requests for no reason a reader could see. */
      sql<{ playlist_id: string; rips: string }>`
        select playlist_id, count(*) as rips
        from pack_rip
        group by playlist_id
        order by rips desc, playlist_id asc
        limit 1
      `,

      /* The rarest card anybody has pulled. Ties break on the most recent, so a second
         UNHEARD replaces the first: the line is meant to read as news. */
      sql<{ title: string; artist: string; tier: string }>`
        select card.title, card.artist, card.tier
        from pack_card as card
        join pack_rip as rip on rip.id = card.rip_id
        order by card.tier_rank desc, rip.ripped_at desc
        limit 1
      `,

      sql<{ rips: string }>`select count(*) as rips from pack_rip`,
    ]);

    /* count() comes back as a string from Postgres, because bigint does not fit a
       double and the driver will not silently lose the top of one. Every count in this
       file is a page counter rather than an astronomical figure, so parsing is safe -
       but it has to be parsed, and `+row.rips` on an undefined row is NaN reaching JSX. */
    const most = opened[0];
    const card = rarest[0];

    const most_opened: MostOpenedPack | null = most
      ? { playlist_id: most.playlist_id, rips: Number(most.rips) }
      : null;

    const rarest_card: RarestCard | null =
      card && isTier(card.tier)
        ? { title: card.title, artist: card.artist, tier: card.tier }
        : null;

    return {
      most_opened,
      rarest_card,
      total_rips: Number(total[0]?.rips ?? 0),
    };
  } catch (error) {
    console.error("[deepcuts] stats failed:", error);
    return empty;
  }
};

/**
 * Records one opened pack and the cards that came out of it.
 *
 * ONE ROUND TRIP PER STATEMENT AND NO TRANSACTION, which is a limitation of the HTTP
 * driver rather than a choice - see src/server/db/index.ts. A rip whose cards fail to
 * insert would leave a counted pack with nothing in it, which skews "most opened" by one
 * and cannot corrupt anything. When the rip is built and that stops being acceptable,
 * the fix is the same one scripts/migrate.mjs already makes: a Pool for the paths that
 * need a real BEGIN.
 *
 * Throws. The caller decides what a failure costs, exactly as the add route does.
 */
const recordRip = async (args: {
  playlist_id: string;
  visitor_id: string;
  cards: {
    track_uri: string;
    title: string;
    artist: string;
    tier: DeepcutTier;
    play_count: number | null;
    /* THE FACE, ADDED WITH THE COLLECTION TAB. A card is a thing that happened and keeps
       what was printed on it, so the artwork and the link are stored rather than looked
       up again later; `shiny` is not stored for looks at all, but because it is a coin
       flipped once and unrecoverable from anything else in the row. See 003. */
    album_art: string | null;
    track_url: string;
    shiny: boolean;
  }[];
}): Promise<void> => {
  const { playlist_id, visitor_id, cards } = args;

  const [rip] = await sql<{ id: string }>`
    insert into pack_rip (playlist_id, visitor_id)
    values (${playlist_id}, ${visitor_id})
    returning id
  `;

  if (!rip) throw new Error("pack_rip insert returned no id");

  /* Sequentially rather than in parallel. Five statements against one row's worth of
     foreign key is not worth the concurrency, and ordering them means a partial failure
     leaves a prefix of the pack rather than an arbitrary subset of it. */
  for (const card of cards) {
    await sql`
      insert into pack_card (
        rip_id, track_uri, title, artist, tier, tier_rank, play_count,
        album_art, track_url, shiny
      )
      values (
        ${rip.id}, ${card.track_uri}, ${card.title}, ${card.artist},
        ${card.tier}, ${tierRank(card.tier)}, ${card.play_count},
        ${card.album_art}, ${card.track_url}, ${card.shiny}
      )
    `;
  }
};

/**
 * One visitor's collection, rarest first.
 *
 * SCOPED TO THE COOKIE, WHICH IS THE WHOLE SECURITY MODEL AND IT IS A THIN ONE. The
 * visitor id is an unguessable uuid in an httpOnly cookie, so a person cannot read
 * somebody else's collection by asking - but they also cannot prove a collection is
 * theirs. Clearing cookies loses the binder; a shared browser shares it. That is the same
 * bargain the suggestion box makes, and the right one here: the alternative is accounts,
 * for a page about opening card packs.
 *
 * ORDERED BY tier_rank RATHER THAN BY THE TIER TEXT, for the reason 002 wrote the column:
 * the ladder is a design decision that lives in DEEPCUT_LADDER, and teaching Postgres a
 * second copy of it is how the two come to disagree. Ties break on the most recent pull,
 * so a new ghost sits above an old one.
 *
 * CAPPED, because this is one query behind a page that renders every row it gets, and a
 * visitor who rips daily for a year has eighteen hundred cards. The cap is a rendering
 * limit rather than a rule about collecting; nothing is deleted.
 *
 * READS DEGRADE, as everywhere else here: an unreachable database is an empty binder and
 * a page that still works, not a page that fails.
 */
const cardsFor = async (args: { visitor_id: string }): Promise<CollectedCard[]> => {
  if (!hasDatabase()) return [];

  try {
    const rows = await sql<{
      id: string;
      track_uri: string;
      title: string;
      artist: string;
      album_art: string | null;
      track_url: string | null;
      tier: string;
      shiny: boolean;
      play_count: number | null;
      /* A Date, not a string, and the driver is what decides that: @neondatabase's
         serverless client parses timestamptz into a Date before this sees it. Declaring
         it as a string typechecks and lies, which is the kind of lie that survives until
         somebody calls a string method on it. */
      ripped_at: Date;
    }>`
      select
        card.id, card.track_uri, card.title, card.artist, card.album_art,
        card.track_url, card.tier, card.shiny, card.play_count, rip.ripped_at
      from pack_card as card
      join pack_rip as rip on rip.id = card.rip_id
      where rip.visitor_id = ${args.visitor_id}
      order by card.tier_rank desc, rip.ripped_at desc, card.id desc
      limit ${COLLECTION_LIMIT}
    `;

    /* ONE PASS, AND flatMap RATHER THAN filter-THEN-CAST. `isTier` is a type guard, but
       it guards `row.tier` and not `row`, so a `.filter()` in front of a `.map()` narrows
       nothing and the map has to assert the rung back - which is the assertion the guard
       existed to avoid. Returning [] for a row that fails the check does the same job and
       actually narrows.

       A row naming a rung this deploy no longer has is dropped rather than rendered:
       `tier` is text so that adding a rung is a deploy rather than a migration, and the
       cost of that is a row an older deploy wrote. */
    return rows.flatMap((row) =>
      isTier(row.tier)
        ? [
            {
              id: String(row.id),
              uri: row.track_uri,
              title: row.title,
              artist: row.artist,
              album_art: row.album_art,
              /* Empty rather than null for a row written before 003 added the column:
                 the card renders without a link, and the type stays ScoredTrack's. */
              url: row.track_url ?? "",
              tier: row.tier,
              shiny: row.shiny,
              plays: row.play_count,
              pulled_at: row.ripped_at.toISOString(),
            },
          ]
        : []
    );
  } catch (error) {
    console.error("[deepcuts] collection failed:", error);
    return [];
  }
};

export const deepcutsStore = {
  stats,
  recordRip,
  cardsFor,
};
