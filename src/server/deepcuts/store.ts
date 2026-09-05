import "server-only";
import { DEEPCUT_LADDER } from "@/constants";
import { DeepcutTier } from "@/models";
import type { DeepcutsStats, MostOpenedPack, RarestCard } from "@/models";
import { isEnumValue } from "@/utils/enum";
import { hasDatabase, sql } from "@/server/db";

/**
 * The three queries /lab/deepcuts makes against Neon, and only those.
 *
 * The same shape as src/server/suggest/store.ts and for the same reason: nothing else
 * in the app writes SQL, so swapping the backing store stays a one-file change.
 *
 * NOTHING CALLS recordRip YET AND THAT IS EXPECTED, NOT AN OVERSIGHT. The rip is not
 * built. What is built is the shelf, which says which playlists a pack could come out
 * of, and the two figures at the top of the page, which are the reads below against an
 * empty table. Both come back null today and the page prints "nothing yet". The writer
 * is here so the rip has somewhere to land rather than needing a migration on the day
 * it is written; see 002_deepcuts.sql, which says the same thing about the schema.
 *
 * READS DEGRADE, AS EVERYWHERE ELSE. A database that cannot be reached leaves the two
 * lines reading "nothing yet" rather than taking the page down, which is the same
 * answer an empty table gives. That collapse is deliberate: the distinction between
 * "nobody has opened a pack" and "we could not ask" is real, and it is not a
 * distinction worth putting in front of a visitor on a page about trading cards.
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
 * NO CALLER YET. See the header: the rip is not built, and this is where it will write.
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
      insert into pack_card (rip_id, track_uri, title, artist, tier, tier_rank, play_count)
      values (
        ${rip.id}, ${card.track_uri}, ${card.title}, ${card.artist},
        ${card.tier}, ${tierRank(card.tier)}, ${card.play_count}
      )
    `;
  }
};

export const deepcutsStore = {
  stats,
  recordRip,
};
