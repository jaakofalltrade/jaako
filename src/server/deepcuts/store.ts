import "server-only";
import { COLLECTION_LIMIT } from "@/constants";
import { DeepcutTier, DEEPCUT_LADDER } from "@/models";
import type { CollectedCard, DeepcutsStats, MostOpenedPack, RarestCard } from "@/models";
import { getIsoDateTimeUtc } from "@/oras";
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
         places between requests for no reason a reader could see.

         sum(opens) RATHER THAN count(*), AND THE FIGURE IS UNCHANGED BY THAT. 006 made a
         pack one row per visitor per playlist per day, so counting rows would now count
         PACKS; the tally of how many times each was torn open moved onto the row. This
         still answers "most opened by everyone", which is what the label promises and
         what the rip route says it is counting. */
      sql<{ playlist_id: string; rips: string }>`
        select playlist_id, sum(opens) as rips
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
        order by card.tier_rank desc, rip.ripped_at_iso_datetime_utc desc
        limit 1
      `,

      /* Openings, not packs, for the same reason as above. coalesce because sum() over no
         rows is null rather than zero, and "nobody has opened a pack" prints 0. */
      sql<{ rips: string }>`select coalesce(sum(opens), 0) as rips from pack_rip`,
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
  /**
   * The Manila calendar day, as getIsoDate renders it.
   *
   * PASSED IN RATHER THAN COMPUTED HERE, so that it is provably the same string packSeed
   * was seeded with. ripPack works one out for the draw and hands that exact value down;
   * a second call to the clock could land on the other side of midnight and let the
   * generator and the unique constraint disagree about which pack this is.
   */
  day: string;
  cards: {
    /** Where in the pack it landed, 0-based. Half of the key that makes a re-write a no-op. */
    slot: number;
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
  const { playlist_id, visitor_id, day, cards } = args;

  /* ONE ROW PER PACK, AND THE SECOND OPENING IS A NUMBER ON IT. Before 006 this inserted
     unconditionally, so opening the same pack twice in a day wrote a second rip and five
     more cards - the same five, because the draw is seeded on exactly this triple, so it
     had already decided they were the same pack. The binder showed everything twice.

     ONE STATEMENT CONFLICTING ON A KEY, which is the shape the suggestion cap uses and for
     the identical reason: a read-then-write has a window where two clicks arriving
     together both find nothing and both insert. The constraint is what actually decides.

     THE DAY COMES FROM THE CALLER, and it is the same string packSeed was given. If these
     two ever disagreed about which day it is, the generator and the database would
     disagree about what "the same pack" means, and the guarantee would quietly stop
     holding at whatever hour they diverged.

     THE MOMENT IS OURS TO STATE, WHICH IT WAS NOT BEFORE 005. The column defaulted to
     now(), so Postgres decided what time a pack was opened. On a re-open it deliberately
     is NOT updated: `ripped_at_iso_datetime_utc` is when this pack was FIRST torn open,
     which is what the collection sorts by and what "a new ghost sits above an old one"
     means. */
  const [rip] = await sql<{ id: string }>`
    insert into pack_rip (playlist_id, visitor_id, day, ripped_at_iso_datetime_utc)
    values (${playlist_id}, ${visitor_id}, ${day}, ${getIsoDateTimeUtc.now()})
    on conflict (visitor_id, playlist_id, day) do update
       set opens = pack_rip.opens + 1
    returning id
  `;

  if (!rip) throw new Error("pack_rip upsert returned no id");

  /* Sequentially rather than in parallel. Five statements against one row's worth of
     foreign key is not worth the concurrency, and ordering them means a partial failure
     leaves a prefix of the pack rather than an arbitrary subset of it.

     `do nothing` MAKES RE-OPENING A NO-OP, AND MAKES A HALF-WRITTEN PACK REPAIRABLE. There
     is still no transaction here - the HTTP driver has none, as 002 notes - so a failure
     after the second card leaves three of five. Without this clause the next opening would
     find the rip row, skip, and the pack would be short forever. With it, every opening
     re-attempts the whole pack and writes only what is missing.

     It is safe because the draw is seeded: the same pack always deals the same five cards
     in the same slots, so a row that already exists is byte-for-byte the row this would
     have written. */
  for (const card of cards) {
    await sql`
      insert into pack_card (
        rip_id, slot, track_uri, title, artist, tier, tier_rank, play_count,
        album_art, track_url, shiny
      )
      values (
        ${rip.id}, ${card.slot}, ${card.track_uri}, ${card.title}, ${card.artist},
        ${card.tier}, ${tierRank(card.tier)}, ${card.play_count},
        ${card.album_art}, ${card.track_url}, ${card.shiny}
      )
      on conflict (rip_id, slot) do nothing
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
 * AND THEN ON THE SLOT, WHICH MEANS SOMETHING AGAIN. The last key only ever separates the
 * five cards of one pack, which share a timestamp to the microsecond. It was `id desc`,
 * which read as reverse deal order while the id was a bigserial and became arbitrary the
 * moment 004 made it a random uuid. 006 stores the slot the draw actually assigned, so
 * the five now read in the order they came out of the wrapper.
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
      /* A STRING NOW, AND THE COMMENT THAT USED TO BE HERE IS WHY. It said: a Date, not
         a string, because the driver parses timestamptz into a Date before this sees it,
         and declaring it a string typechecks and lies. That was true and it was the
         symptom. 005 renamed the column for the format it is supposed to hold and made it
         text, so the driver hands back the ISO UTC string that src/oras says is the only
         thing ever stored or transported, and there is no conversion left to get wrong. */
      ripped_at_iso_datetime_utc: string;
    }>`
      select
        card.id, card.track_uri, card.title, card.artist, card.album_art,
        card.track_url, card.tier, card.shiny, card.play_count,
        rip.ripped_at_iso_datetime_utc
      from pack_card as card
      join pack_rip as rip on rip.id = card.rip_id
      where rip.visitor_id = ${args.visitor_id}
      order by card.tier_rank desc, rip.ripped_at_iso_datetime_utc desc, card.slot asc
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
              /* Not String(row.id) any more. That wrapper was here because the column
                 was a bigserial and int8 arrives as text, so the cast was a no-op that
                 looked like a conversion. It is a uuid now and unambiguously a string. */
              id: row.id,
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
              /* Straight through. It was `.toISOString()` on a Date until 005; the
                 column holds exactly this string now. */
              pulled_at: row.ripped_at_iso_datetime_utc,
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
