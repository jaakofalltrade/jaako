/**
 * deepcuts' rarity ladder, commonest first.
 *
 * THE DECLARATION ORDER IS THE MECHANIC, not a formatting choice. It runs from the songs
 * everyone has already played to the ones almost nobody has, so a card gets rarer as its
 * play count falls - the inversion the whole app is built on, and the reason a chart hit
 * is the card you throw away.
 *
 * IT LIVES HERE RATHER THAN IN Lab.ts, which holds the lab's own catalogue: app ids,
 * statuses, shells. The ladder is not a property of the lab, it is the central type of
 * one app in it, and every other thing deepcuts models is already in this file.
 *
 * THE COMMON HALF ARE RECORD CERTIFICATIONS AND THE RARE HALF ARE NOT, which is the whole
 * idea. "Anthem, chart, rotation, album cut" named what a song WAS and read as four
 * unrelated adjectives rather than as a ranked ladder. Silver, gold, platinum and diamond
 * are the music industry's own awards in the industry's own order, so nothing has to teach
 * a reader which outranks which.
 *
 * THEY RUN SILVER TO DIAMOND, WHICH IS BACKWARDS AGAINST PLAY COUNT AND FORWARDS AGAINST
 * THE APP. Certifications reward SALES, so more plays should mean a better award - and the
 * first version of this ladder ordered them that way, with diamond on the commonest rung.
 * It read as nonsense: the card labelled diamond was the card you throw back. Rarity here
 * runs backwards, so the awards run backwards with it, and every rung from silver upward
 * is a better card than the one before. Diamond is the best of the certified half and
 * deep cut, unheard, ghost and lost are better still.
 *
 * The rare half stays as it was, because it measures the opposite thing - how obscure -
 * and the hinge between diamond and deep cut is exactly where being decorated stops
 * mattering and being unheard starts.
 */
export enum DeepcutTier {
  Diamond = "DIAMOND",
  Platinum = "PLATINUM",
  Gold = "GOLD",
  Silver = "SILVER",
  Deepcut = "DEEPCUT",
  Unheard = "UNHEARD",
  Ghost = "GHOST",
  Lost = "LOST",
}

/**
 * The ladder as an ordered list, commonest first.
 *
 * TS gives no ordered view of an enum's members, and the order is load-bearing here:
 * rarityOf walks it highest-floor-first, an empty bucket's fall-through walks it toward
 * index zero, and pack_card.tier_rank is an index into it. An enum cannot carry that, so
 * the list does - and it sits beside the enum so the two cannot drift apart unnoticed.
 */
export const DEEPCUT_LADDER: DeepcutTier[] = [
  DeepcutTier.Silver,
  DeepcutTier.Gold,
  DeepcutTier.Platinum,
  DeepcutTier.Diamond,
  DeepcutTier.Deepcut,
  DeepcutTier.Unheard,
  DeepcutTier.Ghost,
  DeepcutTier.Lost,
];

/**
 * The fewest plays a track can have and still land on each rung.
 *
 * MEASURED, NOT REASONED. These are quantiles of this account's own catalogue, taken by
 * `pnpm ladder:spread` over 1,097 matched tracks across 60 playlists. The numbers are
 * last.fm SCROBBLES, which are a fraction of streams and are the only counts available -
 * Spotify publishes none - so the ladder is anchored on the shape of what is actually
 * being scored rather than on what a play count "should" look like.
 *
 * WHY IT MOVED AGAIN. The first eight-rung ladder ran one order of magnitude per rung,
 * which is a good rule that needs seven decades of range; the catalogue has about four,
 * and its two commonest rungs could not be reached by any song on the account. The second
 * fixed that but stayed steep at both ends: the commonest rung swallowed 28.8% of
 * everything while
 * `lost` held 0.6%. This one is flatter on purpose - no rung below 4.5% or above 22%:
 *
 *     rung        floor        share of the catalogue
 *     silver      15,000,000      9.2%
 *     gold         4,000,000     20.9%
 *     platinum     1,000,000     21.8%
 *     diamond        300,000     15.6%
 *     deep cut        80,000     11.9%
 *     unheard         20,000      8.5%
 *     ghost            5,000      7.7%
 *     lost                 0      4.5%
 *
 * `lost` floors at zero rather than at some small number, so every non-negative count
 * lands somewhere. Zero is a real answer - last.fm knows the track and nobody has
 * scrobbled it - and it is the genuine top of the ladder. A track last.fm cannot match at
 * all has no count and therefore no rung; see rarityOf.
 *
 * STILL TUNING CONSTANTS, anchored on one account's taste, which is the honest scope of
 * this app. Re-run the script before moving them and move the whole set: the shares are
 * what is being preserved, not any single number in the column.
 */
export const DEEPCUT_TIER_FLOOR: Record<DeepcutTier, number> = {
  [DeepcutTier.Silver]: 15_000_000,
  [DeepcutTier.Gold]: 4_000_000,
  [DeepcutTier.Platinum]: 1_000_000,
  [DeepcutTier.Diamond]: 300_000,
  [DeepcutTier.Deepcut]: 80_000,
  [DeepcutTier.Unheard]: 20_000,
  [DeepcutTier.Ghost]: 5_000,
  [DeepcutTier.Lost]: 0,
};

/**
 * /lab/deepcuts, on both sides of the boundary.
 *
 * Reached through the barrel — `import { DeepcutsPlaylist } from "@/models"` — and
 * holding nothing that runs, like everything else in this folder.
 *
 * DeepcutTier lives in Lab.ts rather than here, and that split is deliberate: the
 * ladder is a property of the lab's catalogue, printed on the index and in the legend,
 * and it was modelled before any of this existed. What is here is the data the page
 * fetches. The plan both came out of is in docs/lab.md.
 */

/**
 * One playlist, as a pack on the shelf.
 *
 * FIVE FIELDS, AND THE ABSENCES ARE THE DESIGN. PlaylistSummary in Suggest.ts is the
 * neighbouring shape and it carries three things this one refuses:
 *
 *   description   A pack wrapper is not a place for a paragraph. Spotify sends it and
 *                 the page drops it rather than carrying it down for nobody.
 *   runtime_ms    Spotify reports no duration for a playlist, so the suggest header
 *                 sums every track to get one. That is one request per page of items
 *                 for ONE playlist; across a whole library it is a request storm for a
 *                 number no pack prints.
 *   owner         Every playlist here is owned by the same account — that is the filter
 *                 the server applied to build the list — so printing it on each pack
 *                 would be the same word thirty times.
 *
 * `id` is not rendered and is here anyway. It is the key the list is drawn with, and it
 * is what a pack rip will eventually be dealt from. It is not a secret: it is the
 * visible part of the URL in `url`.
 */
export type DeepcutsPlaylist = {
  /** Spotify's own id. Base62, 22 characters. */
  id: string;
  name: string;
  /** The cover, host-checked, or null when there is none we will render. */
  cover: string | null;
  /** The public Spotify page. Where the pack links. */
  url: string;
  /**
   * How many tracks are on it, which the page prints as a card count.
   *
   * Zero is a real answer and renders as one. An empty playlist is a pack with nothing
   * in it, which is worth seeing rather than hiding.
   */
  track_count: number;
};

/**
 * What the shelf is handed.
 *
 * NULL AND EMPTY ARE DIFFERENT ANSWERS AND THE PAGE SAYS DIFFERENT THINGS FOR THEM,
 * which is the only reason this is not a bare array.
 *
 *   null   The read did not happen. No credentials, the scope was never granted, or
 *          Spotify was unreachable. Reads degrade: the page falls back to the sealed
 *          pack it has always shown and says nothing about a failure.
 *   []     The read worked and nothing qualified. Every playlist on the account is
 *          private, or followed rather than owned. That is a true sentence about the
 *          account and the page can print it.
 *
 * Collapsing the two would mean an account with no public playlists reading as an
 * outage, and an outage reading as an empty account.
 */
export type DeepcutsLibrary = DeepcutsPlaylist[] | null;

/* ---------------- what the rip records, and what the page prints of it ----------------

   EVERY FIELD BELOW IS NULLABLE AND THAT IS STILL RIGHT, though no longer for the reason
   first written here. It said the rip was not built and the tables were empty by
   construction; the rip works now and the tables fill up. What has not changed is that a
   fresh deployment, or a fresh Neon branch, starts empty - so "nothing yet" stays a state
   the page renders rather than a case it guards. See 002_deepcuts.sql. */

/**
 * The playlist that has been ripped most often.
 *
 * NO NAME ON IT, DELIBERATELY. The database holds the playlist id and nothing else
 * about the playlist, so the name is resolved against the shelf read from Spotify on
 * the same request. That is the rule 001_suggest.sql set and this follows: a row of
 * ours annotates something of Spotify's and can never conjure it. Rename a playlist and
 * this line renames with it.
 */
export type MostOpenedPack = {
  playlist_id: string;
  rips: number;
};

/**
 * The rarest card anybody has pulled.
 *
 * `tier` is the DeepcutTier value, not its label: the copy for a rung lives in
 * DEEPCUT_TIER in src/constants/lab.ts, as it does everywhere else.
 */
export type RarestCard = {
  title: string;
  artist: string;
  tier: DeepcutTier;
};

/**
 * The two lines beside the title.
 *
 * Both nullable. A null renders the "nothing yet" copy rather than a zero: on a
 * deployment where nobody has opened a pack, "most opened: 0" would be a number
 * answering a question about which playlist.
 */
export type DeepcutsStats = {
  most_opened: MostOpenedPack | null;
  rarest_card: RarestCard | null;
  /** Every pack ever opened. Zero is a real answer and the page prints it. */
  total_rips: number;
};

/* ---------------- what is inside one pack ---------------- */

/**
 * One song on a playlist, with the rung its play count puts it on.
 *
 * TWO NULLABLE FIELDS AND THEY GO TOGETHER. `plays` is null when last.fm could not
 * match the track, or when there is no last.fm key at all, and `tier` is null exactly
 * when `plays` is - rarityOf refuses to score what it cannot count. The panel renders
 * such a row as unmatched rather than putting it on the rarest rung, which is what
 * guessing would do.
 */
export type ScoredTrack = {
  /** `spotify:track:<22 chars>`, or empty for a local file Spotify has no uri for. */
  uri: string;
  title: string;
  artist: string;
  /**
   * The record's cover, on Spotify's CDN, or null for a track with no artwork.
   *
   * Free to carry: `album(name,images)` was already on the playlist projection, so the
   * art was arriving on every track and being dropped on the floor.
   */
  album_art: string | null;
  /**
   * The public Spotify page for the track. Host-checked, like every other link the site
   * renders from a third party.
   *
   * Free to carry, as the art was: `external_urls` is already on the playlist projection.
   * A card in an opened pack links out through this, so somebody who pulls something good
   * can go and listen to it.
   */
  url: string;
  /** Global scrobbles on last.fm. Not Spotify streams; the page says so. */
  plays: number | null;
  tier: DeepcutTier | null;
};

/**
 * What the panel behind an opened pack renders.
 *
 * `scored` IS NOT DERIVABLE FROM THE TRACKS, which is why it is its own field. A
 * playlist whose every track happens to be unmatched looks identical to one on a
 * deployment with no last.fm key, and the two want different sentences: the first is
 * bad luck and the second is a missing variable.
 */
export type PackContents = {
  playlist_id: string;
  name: string;
  /** Every track on the playlist, which may be more than were scored. */
  track_count: number;
  /** Whether the rungs mean anything: false when last.fm is not configured. */
  scored: boolean;
  /** The first SCORED_TRACK_LIMIT of them, in playlist order. */
  tracks: ScoredTrack[];
};

/* ---------------- an opened pack ---------------- */

/**
 * One card, as it comes out of a rip.
 *
 * A SCORED TRACK PLUS THE TWO THINGS THE DRAW DECIDED. The track and its rung were
 * already facts about the song; `shiny` is the second roll, and `slot` is where in the
 * pack it landed. Everything else is inherited, so a card renders from the same fields
 * the table already prints.
 */
export type PackCard = {
  track: ScoredTrack;
  tier: DeepcutTier;
  shiny: boolean;
  /** 0-based. The last slot is the hit, which is why the order is worth keeping. */
  slot: number;
};

/**
 * What POST /api/lab/deepcuts/rip answers with.
 *
 * `cards` is empty only when the playlist had nothing scoreable on it, which the page
 * renders as a refusal rather than as an empty pack.
 */
export type RipResponse = {
  playlist_id: string;
  cards: PackCard[];
  /** A sentence written for the visitor. Present only when the rip could not happen. */
  error?: string;
};

/* ---------------- what somebody has kept ---------------- */

/**
 * One card in a visitor's collection, read back out of Neon.
 *
 * NOT A PackCard, AND THE DIFFERENCE IS TIME. A PackCard is a card being dealt: it hangs
 * off a live ScoredTrack, so its play count and its artwork are whatever Spotify and
 * last.fm say right now. This is a card that was dealt - a row written at the moment it
 * came out of a wrapper, keeping what was printed on it then. Reusing PackCard would
 * have meant either re-fetching every song on a collection page or lying about which
 * shape the numbers came from.
 *
 * That is also why `plays` is a number frozen at deal time rather than a fresh count. A
 * card in a binder does not get rarer because the world listened to the song again.
 */
export type CollectedCard = {
  /** Neon's own row id, as text. Two identical cards from two rips are two entries. */
  id: string;
  /** `spotify:track:<22 chars>`, or empty for a local file. */
  uri: string;
  title: string;
  artist: string;
  album_art: string | null;
  /** Empty when the row predates the column, or when Spotify offered no link. */
  url: string;
  tier: DeepcutTier;
  shiny: boolean;
  /** What the rung was decided from. Null for a row written before the count was known. */
  plays: number | null;
  /** ISO 8601. When the pack this came out of was opened. */
  pulled_at: string;
};

/**
 * What GET /api/lab/deepcuts/cards answers with.
 *
 * An empty list is the ordinary answer, not a failure: it is what every browser that has
 * never opened a pack gets, and the tab renders an invitation rather than an error.
 */
export type CollectionResponse = {
  cards: CollectedCard[];
};
