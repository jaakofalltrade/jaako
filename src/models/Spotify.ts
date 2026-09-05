/**
 * Everything Spotify, on both sides of the boundary.
 *
 * Reached as a namespace — `import { Spotify } from "@/models"` — so a name like
 * NowPlayingResponse always says whose it is at the point of use.
 *
 * The types our own /api/spotify/now-playing route returns take the plain names.
 * The types Spotify's Web API sends us are named after the endpoint that
 * produces them, so it's never ambiguous which side of the wire you're holding.
 */

/**
 * Which of the two Spotify credentials a call spends.
 *
 * An enum rather than a boolean because it is bound into a client in
 * server/spotify/spotifyApiClient.ts rather than passed per call, and "write: true" at
 * a call site was the thing that made spending the wrong one possible.
 */
export enum Credential {
  Read = "READ",
  Write = "WRITE",
}

export enum PlaybackStatus {
  Playing = "PLAYING",
  Recent = "RECENT",
  Offline = "OFFLINE",
}

/* ---------------- what our own route returns ---------------- */

export type Track = {
  title: string;
  artist: string;
  album: string;
  /** Album cover on Spotify's CDN, or null for tracks with no artwork. */
  album_art: string | null;
  /** Public Spotify page for the track. */
  url: string;
  duration_ms: number;
  /** How far into the track playback was at fetch time. Only set for the hero track. */
  progress_ms: number;
};

export type NowPlayingResponse = {
  status: PlaybackStatus;
  track: Track | null;
  recent: Track[];
};

/* ---------------- what spotify sends us ---------------- */

export type TokenResponse = {
  access_token: string;
  expires_in?: number;
};

export type ImageResponse = {
  url?: string;
  /**
   * Nullable, and not defensively. Album art carries real numbers; a playlist's
   * uploaded cover comes back {"height":null,"width":null,"url":...}, measured against
   * the real lab playlist. pickArt scores a missing width as 0 and sorts it last,
   * which is the behaviour that wants, not a bug to guard.
   */
  width?: number | null;
  height?: number | null;
};

/** Only the fields we actually read off Spotify's track object. */
export type TrackResponse = {
  /** `spotify:track:<22 chars>`. Present on search results and playlist items. */
  uri?: string;
  name?: string;
  duration_ms?: number;
  artists?: { name?: string }[];
  album?: { name?: string; images?: ImageResponse[] };
  external_urls?: { spotify?: string };
};

export type CurrentlyPlayingResponse = {
  is_playing?: boolean;
  progress_ms?: number;
  item?: TrackResponse;
};

export type RecentlyPlayedResponse = {
  items?: { track?: TrackResponse }[];
};

/* ---------------- listening statistics ---------------- */

/**
 * The instrument strip's fourth cell.
 *
 * Note what is *not* here: minutes listened. The Spotify Web API has no
 * cumulative-listening-time endpoint — the figure Wrapped shows comes from
 * Spotify's internal data — and /me/player/recently-played caps at 50 items, so
 * it can't be derived either. Top artist, track and genre are the real ones.
 *
 * Requires the user-top-read scope, which the now-playing pair does not.
 */
export type TopArtist = {
  name: string;
  url: string;
};

export type TopTrack = {
  title: string;
  artist: string;
  url: string;
};

export type TopItemsResponse = {
  /** False when credentials are missing, the scope was never granted, or Spotify is down. */
  available: boolean;
  artist: TopArtist | null;
  track: TopTrack | null;
  /** Most common genre across the top artists. Spotify tags artists, not tracks. */
  genre: string | null;
};

/* ---------------- what spotify sends us ---------------- */

export type TopArtistResponse = {
  name?: string;
  genres?: string[];
  external_urls?: { spotify?: string };
};

export type TopArtistsResponse = {
  items?: TopArtistResponse[];
};

export type TopTracksResponse = {
  items?: TrackResponse[];
};

/* ---------------- the lab playlist ----------------

   WHAT SPOTIFY ACTUALLY RETURNS, WHICH IS NOT WHAT ITS OLDER DOCUMENTATION SAYS.
   Every shape below was measured against the real playlist rather than assumed, and
   three of them differ from the form that is still widely written down:

     1. The playlist object's paging field is `items`, NOT `tracks`. A `fields`
        projection asking for tracks(total) returns nothing at all, silently.
     2. The collection is read from /playlists/{id}/items. /playlists/{id}/tracks
        answers 403 Forbidden, even for the owner of a public playlist.
     3. Inside a page, the track hangs off `item`, NOT `track`.

   Get any of those wrong and the call succeeds with an empty projection, which is the
   worst failure shape available: no error, no data, and nothing to grep for. */

export type PlaylistItemResponse = {
  added_at?: string;
  /** The track. Not `track` — see the note above. */
  item?: TrackResponse;
};

export type PlaylistItemsResponse = {
  total?: number;
  /** An absolute URL to the next page, or null on the last one. */
  next?: string | null;
  items?: PlaylistItemResponse[];
};

/**
 * The playlist record, with its first page of items embedded.
 *
 * That embedding is the whole reason one request serves the page: `items` is a full
 * paging object, not just a count, so the header and the list arrive together.
 */
export type PlaylistResponse = {
  name?: string;
  description?: string;
  external_urls?: { spotify?: string };
  images?: ImageResponse[];
  owner?: { display_name?: string };
  followers?: { total?: number };
  /** Not `tracks` — see the note above. */
  items?: PlaylistItemsResponse;
};

/* ---------------- the account's own playlists ----------------

   /lab/deepcuts lists the playlists a pack could be dealt from, which is a different
   read from the one above: that one is ONE playlist named by an id in config, this one
   is EVERY playlist on the account.

   GET /me/playlists TAKES NO `fields` PARAMETER. The projection that keeps the
   playlist read above small is documented for the /playlists/{id} family only, so this
   response arrives whole and the shapes below are a subset of what turns up rather than
   a subset that was asked for. Nothing is saved by pretending otherwise.

   IT IS ALSO A 403 WITHOUT playlist-read-private, and so is
   GET /users/{id}/playlists — for public playlists, on the owner's own token.
   Measured against the live API on 2026-09-05. See SCOPE_SETS in
   scripts/spotify-token.mjs for why that scope is requested and what it is not for. */

/**
 * One playlist as it arrives in a list of them.
 *
 * Spotify calls this the simplified playlist object. It is the full record above minus
 * the embedded page of items, plus the two fields the full record does not need to
 * carry: `id`, because a list has to key its rows on something, and `public`, which is
 * what decides whether a playlist reaches a page anyone can open.
 *
 * `public` IS THREE-VALUED AND THE THIRD VALUE IS THE INTERESTING ONE. Spotify sends
 * null when it will not say — the relationship between the token and the playlist is
 * not one it answers for — and null is not "yes". Every filter on this field compares
 * against true rather than testing for truthiness, so an unanswered playlist is treated
 * as private, which is the direction to be wrong in.
 *
 * `owner.id` rather than `owner.display_name`: a library holds followed playlists
 * alongside owned ones, and two accounts can share a display name.
 */
export type SimplePlaylistResponse = {
  id?: string;
  name?: string;
  description?: string;
  public?: boolean | null;
  collaborative?: boolean;
  external_urls?: { spotify?: string };
  images?: ImageResponse[];
  owner?: { id?: string; display_name?: string };
  /**
   * How many tracks are on it. `items`, NOT `tracks`, and that is measured.
   *
   * The note at the top of the previous section found this on the full playlist record,
   * the hard way. It holds here too, measured against GET /me/playlists itself on
   * 2026-09-05: across a real library of 199 playlists, every entry carried
   * `items: { href, total }` and not one carried a `tracks` key at all.
   *
   * `tracks` IS STILL DECLARED AND STILL READ, SECOND. It is the name every version of
   * Spotify's documentation uses, so it is the name this endpoint would move back to if
   * it ever moved. Reading it after `items` costs one `??` and cannot be wrong either
   * way, and the failure it insures against is the quiet one this whole section warns
   * about: a track count of zero on a playlist with forty songs on it, rendered without
   * complaint.
   */
  items?: { total?: number };
  tracks?: { total?: number };
};

/** One page of GET /me/playlists. */
export type MyPlaylistsResponse = {
  /** The size of the WHOLE library, before any filter of ours. Never the rendered count. */
  total?: number;
  /** An absolute URL to the next page, or null on the last one. */
  next?: string | null;
  items?: SimplePlaylistResponse[];
};

/**
 * GET /me, cut down to the one field anything here reads.
 *
 * Which account the read token belongs to. Needed because "my playlists" cannot be
 * answered by the library endpoint alone: it returns followed playlists beside owned
 * ones, and telling them apart means comparing an owner id against this.
 */
export type ProfileResponse = {
  id?: string;
  display_name?: string;
};

/** What /search?type=track answers with. */
export type SearchTracksResponse = {
  tracks?: {
    items?: TrackResponse[];
  };
};

