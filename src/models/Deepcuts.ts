import type { DeepcutTier } from "./Lab";

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
  /**
   * The chance this song is the pack's PULL, as a percentage with one decimal.
   *
   * THE HIT SLOT ONLY, WHICH IS THE WHOLE POINT OF THE FIGURE. It once counted the four
   * common slots too, and that buried the rarity under a floor set by playlist length -
   * on a twelve-track list every song started at 36.4% and the column said nothing. See
   * pullChance for the arithmetic and the argument.
   *
   * ZERO MEANS "COMMON ONLY" AND IS A REAL ANSWER: this rung is above anything the hit
   * slot can reach on this playlist, so the track can arrive in a pack but can never be
   * the card it was opened for.
   *
   * Null for a track with no rung, which is the same set of tracks that are not in the
   * pool at all.
   */
  chance: number | null;
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
