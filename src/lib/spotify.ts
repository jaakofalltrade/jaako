/**
 * Spotify Web API plumbing for the now_playing panel.
 *
 * Server-only — this module reads the client secret and refresh token out of
 * the environment, so it must never be imported from a "use client" file. The
 * sole consumer is src/app/api/spotify/now-playing/route.ts.
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";

export interface NowPlayingTrack {
  title: string;
  artist: string;
  album: string;
  /** Album cover URL on Spotify's CDN, or null for tracks with no artwork. */
  albumArt: string | null;
  /** Public Spotify page for the track. */
  url: string;
  durationMs: number;
  /** How far into the track playback was at fetch time. Only set for the hero track. */
  progressMs: number;
}

export type NowPlayingStatus = "playing" | "recent" | "offline";

export interface NowPlayingPayload {
  status: NowPlayingStatus;
  track: NowPlayingTrack | null;
  recent: NowPlayingTrack[];
}

/** What the panel renders when credentials are missing or Spotify is unreachable. */
export const OFFLINE_PAYLOAD: NowPlayingPayload = {
  status: "offline",
  track: null,
  recent: [],
};

/** Minimal shape of the bits of Spotify's track object we actually read. */
interface SpotifyTrack {
  name?: string;
  duration_ms?: number;
  artists?: { name?: string }[];
  album?: { name?: string; images?: { url?: string; width?: number }[] };
  external_urls?: { spotify?: string };
}

interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/**
 * Reads the three required env vars. Returns null when any is missing so the
 * route can degrade to the offline panel instead of throwing.
 */
export function readCredentials(): SpotifyCredentials | null {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

/**
 * Access tokens live an hour, so hold one in module scope and reuse it across
 * requests that land on the same warm server instance. Expiry is deliberately
 * pulled 60s early to avoid racing the boundary.
 */
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken({ clientId, clientSecret, refreshToken }: SpotifyCredentials) {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      // Spotify wants the client pair as HTTP Basic, not as body params.
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    cache: "no-store",
  });

  if (!res.ok) {
    cachedToken = null;
    throw new Error(`token refresh failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in?: number };
  const ttl = (json.expires_in ?? 3600) * 1000;
  cachedToken = { value: json.access_token, expiresAt: Date.now() + ttl - 60_000 };
  return cachedToken.value;
}

/**
 * Prefers the ~300px cover over the 640px original — the panel renders it at
 * 76px, so the big one is wasted bytes.
 */
function pickArt(images: { url?: string; width?: number }[] | undefined): string | null {
  if (!images?.length) return null;
  const sorted = [...images].sort(
    (a, b) => Math.abs((a.width ?? 0) - 300) - Math.abs((b.width ?? 0) - 300),
  );
  return sorted[0]?.url ?? null;
}

function normalizeTrack(track: SpotifyTrack, progressMs = 0): NowPlayingTrack {
  return {
    title: track.name ?? "unknown",
    artist: track.artists?.map((a) => a.name).filter(Boolean).join(", ") || "unknown",
    album: track.album?.name ?? "",
    albumArt: pickArt(track.album?.images),
    url: track.external_urls?.spotify ?? "https://open.spotify.com",
    durationMs: track.duration_ms ?? 0,
    progressMs,
  };
}

async function spotifyGet(path: string, token: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  // 204 means "nothing is playing" and carries no body at all — calling
  // res.json() on it throws, so it has to be caught before parsing.
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Builds the panel payload.
 *
 * A paused track is reported as "recent" rather than a third state: the art
 * should only spin while sound is actually coming out, and the paused track is
 * still the most accurate answer to "what did you last listen to".
 */
export async function getNowPlayingPayload(creds: SpotifyCredentials): Promise<NowPlayingPayload> {
  const token = await getAccessToken(creds);

  const [current, history] = await Promise.all([
    spotifyGet("/me/player/currently-playing?additional_types=track", token),
    spotifyGet("/me/player/recently-played?limit=4", token),
  ]);

  const historyTracks: NowPlayingTrack[] = (history?.items ?? [])
    .map((item: { track?: SpotifyTrack }) => item.track)
    .filter((t: SpotifyTrack | undefined): t is SpotifyTrack => Boolean(t?.name))
    .map((t: SpotifyTrack) => normalizeTrack(t));

  const currentTrack: SpotifyTrack | undefined = current?.item;

  if (currentTrack?.name) {
    // recently-played never contains the track that is currently playing, so
    // the first three entries can be used as-is.
    return {
      status: current.is_playing ? "playing" : "recent",
      track: normalizeTrack(currentTrack, current.progress_ms ?? 0),
      recent: historyTracks.slice(0, 3),
    };
  }

  // Nothing loaded in the player at all — promote the most recent play to the
  // hero slot and drop it from the list so it doesn't appear twice.
  if (historyTracks.length) {
    return { status: "recent", track: historyTracks[0], recent: historyTracks.slice(1, 4) };
  }

  return OFFLINE_PAYLOAD;
}
