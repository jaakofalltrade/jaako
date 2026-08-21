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
