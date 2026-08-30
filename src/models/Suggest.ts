/**
 * The song suggestion app, on both sides of the boundary.
 *
 * Reached through the barrel — `import { SuggestFailure } from "@/models"` — like
 * everything else in this folder, and holding nothing that runs.
 *
 * The types our own routes return take the plain names. Spotify's upstream search and
 * playlist shapes belong in Spotify.ts beside the ones already there, so it is never
 * ambiguous which side of the wire you are holding.
 *
 * The plan every one of these came out of is in docs/lab.md.
 */

/**
 * Every way a suggestion can be refused.
 *
 * The sentence a visitor reads for each is in SUGGEST_MESSAGE in
 * src/constants/suggest.ts — these are identifiers, not copy, exactly as
 * ValidationFailure is for the contact form.
 */
export enum SuggestFailure {
  Malformed = "MALFORMED",
  NameRequired = "NAME_REQUIRED",
  NameTooShort = "NAME_TOO_SHORT",
  NameTooLong = "NAME_TOO_LONG",
  /** The name contains a term on the blocklist. See server/suggest/blocklist.ts. */
  NameBlocked = "NAME_BLOCKED",
  TrackInvalid = "TRACK_INVALID",
  /** Longer than MAX_TRACK_MS. Nobody is parking a 40-minute DJ set on the playlist. */
  TrackTooLong = "TRACK_TOO_LONG",
  Duplicate = "DUPLICATE",
  CapReached = "CAP_REACHED",
  /** No refresh token, no playlist id, or no database. The route answers 503. */
  NotConfigured = "NOT_CONFIGURED",
  SpotifyFailed = "SPOTIFY_FAILED",
}

/**
 * What one row of the rendered list is doing, client-side only.
 *
 * The list is updated optimistically: an add prepends its row immediately and the
 * server's answer either confirms it or does not. Adding is therefore a claim, and
 * Failed is what stops that claim from ever quietly becoming a lie.
 */
export enum RowState {
  /** Came from the server. It is really on the playlist. */
  Settled = "SETTLED",
  /** Prepended optimistically, not yet confirmed. */
  Adding = "ADDING",
  /** The add came back an error. Carries the reason and a retry. */
  Failed = "FAILED",
}

/* ---------------- what our own routes return ---------------- */

export type SearchResult = {
  /** `spotify:track:<22 chars>`. The uri, not the id: it is what the add call takes. */
  uri: string;
  title: string;
  artist: string;
  /**
   * The record it is from. Empty when Spotify reports none, which happens.
   *
   * Free to carry: album(name,images) is already on every projection this app makes,
   * because the cover was wanted anyway, so the name was arriving and being dropped.
   */
  album: string;
  /** Cover on Spotify's CDN, or null for a track with no artwork. */
  album_art: string | null;
  url: string;
  duration_ms: number;
};

/**
 * One row of the playlist as the page renders it.
 *
 * AN INTERSECTION RATHER THAN A COPY, and that is a correction. It listed every field
 * of SearchResult again, which is exactly what toQueueEntry builds it from - it spreads
 * a SearchResult and adds two - so the two shapes were the same thing written twice.
 * Adding one field to a track broke this in two places before anybody noticed the
 * duplication, which is the whole argument.
 */
export type QueueEntry = SearchResult & {
  added_at: string;
  /**
   * Ours, not Spotify's. Null for anything added before this app existed, or added by
   * the owner directly in Spotify: the API reports every track as added by whichever
   * account owns the token, which is the same answer for all of them and therefore no
   * answer at all.
   */
  added_by: string | null;
};

/**
 * The playlist itself, as the page's header renders it.
 *
 * Read on the server and passed down, so the browser never learns the playlist id and
 * never calls Spotify. `runtime_ms` is summed across every page of items, because
 * Spotify reports a count and never a duration.
 */
export type PlaylistSummary = {
  name: string;
  description: string;
  /** The cover, host-checked, or null when there is none we will render. */
  cover: string | null;
  /** Public page for the playlist. Where the header links. */
  url: string;
  track_count: number;
  runtime_ms: number;
  owner: string;
};

/**
 * The playlist and everything on it, read together.
 *
 * One shape because it comes from one request: Spotify embeds a playlist's first page
 * of items inside the record, so the header and the rows arrive at the same time and
 * splitting them would mean asking twice for what already came once.
 */
export type PlaylistSnapshot = {
  summary: PlaylistSummary;
  /** Newest first, because tracks are inserted at position 0. */
  queue: QueueEntry[];
};

export type SearchResponse = {
  results: SearchResult[];
};

export type AddRequest = {
  track_uri: string;
  name: string;
};

/**
 * What POST /api/lab/suggest/add answers with.
 *
 * `entry` is the server's own version of the row, which the page swaps in over its
 * optimistic one. That is what makes a refetch of the whole list unnecessary.
 */
export type AddResponse = {
  added: boolean;
  entry?: QueueEntry;
  /** A sentence written for the visitor to read. Present only when `added` is false. */
  error?: string;
};

/**
 * The verdict on one raw request body.
 *
 * Same discriminated union as ValidationResult in Contact.ts, and for the same
 * reason: narrowing on `valid` hands back the half that actually exists, and neither
 * half is reachable without checking first.
 */
export type SuggestValidation =
  | { valid: true; request: AddRequest }
  | { valid: false; failure: SuggestFailure };

/* ---------------- what the database holds ---------------- */

/** One row of `suggestion`, named for its columns. */
export type SuggestionRow = {
  id: number;
  track_uri: string;
  name: string;
  visitor_id: string;
  added_at: string;
};
