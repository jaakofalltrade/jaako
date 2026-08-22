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
  width?: number;
};

/** Only the fields we actually read off Spotify's track object. */
export type TrackResponse = {
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
