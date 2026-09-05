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

   NONE OF THIS HAS DATA YET, WHICH IS THE POINT OF MODELLING IT AS NULLABLE THROUGHOUT.
   The rip is not built: the shelf above says which playlists a pack could come out of,
   and nothing opens one. The two figures at the top of the page are queries against an
   empty table, and every shape below is arranged so that "empty" is a value the page can
   render rather than a case it has to guard. See 002_deepcuts.sql. */

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
 * Both nullable, and both are null today. A null renders the "nothing yet" copy rather
 * than a zero: nobody has opened a pack, and "most opened: 0" would be a number
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
