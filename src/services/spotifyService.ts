import { serverConfig } from "@/config/serverConfig";
import {
  ART_HOST,
  OFFLINE_RESPONSE,
  PREFERRED_ART_WIDTH,
  RECENT_LIMIT,
  RECENT_SHOWN,
  TOKEN_EXPIRY_MARGIN_MS,
  TOP_ARTIST_LIMIT,
  TOP_ITEMS_OFFLINE,
  TOP_TIME_RANGE,
  TOP_TRACK_LIMIT,
} from "@/constants/spotify";
import { Spotify } from "@/models";

/**
 * Spotify Web API plumbing for the now_playing panel.
 *
 * Server-only — this reads the client secret and refresh token through
 * serverConfig, so it must never be imported from a "use client" file. Its sole
 * consumer is src/app/api/spotify/now-playing/route.ts.
 */

// The only two query strings in here. Both are Spotify's own parameters, so
// they're written out rather than assembled at each call site.
const CURRENTLY_PLAYING_PATH = "/me/player/currently-playing?additional_types=track";
const RECENTLY_PLAYED_PATH = `/me/player/recently-played?limit=${RECENT_LIMIT}`;
const TOP_ARTISTS_PATH = `/me/top/artists?time_range=${TOP_TIME_RANGE}&limit=${TOP_ARTIST_LIMIT}`;
const TOP_TRACKS_PATH = `/me/top/tracks?time_range=${TOP_TIME_RANGE}&limit=${TOP_TRACK_LIMIT}`;

/**
 * Access tokens live an hour, so one is held in module scope and reused across
 * requests landing on the same warm server instance.
 *
 * The closure is the point: this is the only mutable state in the module, and
 * swapping it for Redis later means replacing this factory and nothing else.
 */
const createTokenCache = () => {
  let cached: { value: string; expires_at: number } | null = null;

  return {
    read: (): string | null =>
      cached && cached.expires_at > Date.now() ? cached.value : null,
    write: (args: { value: string; ttl_ms: number }) => {
      const { value, ttl_ms } = args;
      cached = { value, expires_at: Date.now() + ttl_ms - TOKEN_EXPIRY_MARGIN_MS };
    },
    clear: () => {
      cached = null;
    },
  };
};

const tokenCache = createTokenCache();

/** False on a fresh clone or a host with a forgotten variable — the panel degrades instead of throwing. */
const hasCredentials = (): boolean =>
  Boolean(
    serverConfig.spotify_client_id &&
      serverConfig.spotify_client_secret &&
      serverConfig.spotify_refresh_token,
  );

const getAccessToken = async (): Promise<string> => {
  const cached = tokenCache.read();
  if (cached) return cached;

  const credentials = `${serverConfig.spotify_client_id}:${serverConfig.spotify_client_secret}`;

  const response = await fetch(serverConfig.spotify_token_url, {
    method: "POST",
    headers: {
      // Spotify wants the client pair as HTTP Basic, not as body params.
      Authorization: `Basic ${Buffer.from(credentials).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: serverConfig.spotify_refresh_token,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    tokenCache.clear();
    // Status only. The response body can echo credential detail, and this lands
    // in the host's logs.
    throw new Error(`token refresh failed: ${response.status}`);
  }

  const token = (await response.json()) as Spotify.TokenResponse;
  tokenCache.write({ value: token.access_token, ttl_ms: (token.expires_in ?? 3600) * 1000 });
  return token.access_token;
};

const get = async <T>(args: { path: string; token: string }): Promise<T | null> => {
  const { path, token } = args;

  const response = await fetch(`${serverConfig.spotify_api_url}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  // 204 means "nothing is playing" and carries no body at all — calling .json()
  // on it throws, so it has to be caught before parsing.
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
};

/** Only Spotify's own CDN is allowed to end up in an <img src>. */
const toArtUrl = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname === ART_HOST ? url : null;
  } catch {
    return null;
  }
};

/** Prefers the cover closest to PREFERRED_ART_WIDTH over the 640px original. */
const pickArt = (images: Spotify.ImageResponse[] | undefined): string | null => {
  if (!images?.length) return null;

  const byCloseness = [...images].sort(
    (a, b) =>
      Math.abs((a.width ?? 0) - PREFERRED_ART_WIDTH) -
      Math.abs((b.width ?? 0) - PREFERRED_ART_WIDTH),
  );

  return toArtUrl(byCloseness[0]?.url);
};

const toTrack = (args: {
  track: Spotify.TrackResponse;
  progress_ms?: number;
}): Spotify.Track => {
  const { track, progress_ms = 0 } = args;

  return {
    title: track.name ?? "unknown",
    artist: track.artists?.map((artist) => artist.name).filter(Boolean).join(", ") || "unknown",
    album: track.album?.name ?? "",
    album_art: pickArt(track.album?.images),
    url: track.external_urls?.spotify ?? "https://open.spotify.com",
    duration_ms: track.duration_ms ?? 0,
    progress_ms,
  };
};

/**
 * Builds the panel response.
 *
 * A paused track is reported as Recent rather than a fourth state: the art should
 * only spin while sound is actually coming out, and the paused track is still the
 * most accurate answer to "what did you last listen to".
 *
 * Never throws. The panel is decoration, not infrastructure — anything going
 * wrong degrades to the offline shape so the homepage renders cleanly.
 */
const getNowPlaying = async (): Promise<Spotify.NowPlayingResponse> => {
  try {
    // Inside the try, not before it: the route handler has no catch of its own,
    // so anything that escapes here is a 500 rather than the offline panel.
    if (!hasCredentials()) return OFFLINE_RESPONSE;

    const token = await getAccessToken();

    const [current, history] = await Promise.all([
      get<Spotify.CurrentlyPlayingResponse>({ path: CURRENTLY_PLAYING_PATH, token }),
      get<Spotify.RecentlyPlayedResponse>({ path: RECENTLY_PLAYED_PATH, token }),
    ]);

    const recent = (history?.items ?? [])
      .map((item) => item.track)
      .filter((track): track is Spotify.TrackResponse => Boolean(track?.name))
      .map((track) => toTrack({ track }));

    const currentTrack = current?.item;

    if (currentTrack?.name) {
      // recently-played never contains the track that is currently playing, so
      // the first entries can be used as-is.
      return {
        status: current?.is_playing
          ? Spotify.PlaybackStatus.Playing
          : Spotify.PlaybackStatus.Recent,
        track: toTrack({ track: currentTrack, progress_ms: current?.progress_ms ?? 0 }),
        recent: recent.slice(0, RECENT_SHOWN),
      };
    }

    // Nothing loaded in the player at all — promote the most recent play to the
    // hero slot and drop it from the list so it doesn't appear twice.
    if (recent.length) {
      return {
        status: Spotify.PlaybackStatus.Recent,
        track: recent[0],
        // Offset by one because the hero track was taken from the front.
        recent: recent.slice(1, RECENT_SHOWN + 1),
      };
    }

    return OFFLINE_RESPONSE;
  } catch (error) {
    console.error("[spotify] now-playing failed:", error);
    return OFFLINE_RESPONSE;
  }
};

/**
 * Listening statistics for the instrument strip.
 *
 * Needs the user-top-read scope, which the now-playing pair does not — so on a
 * deployment whose refresh token predates that scope, Spotify answers 403 and this
 * returns the unavailable shape rather than throwing. That is the expected state
 * until the token is rotated, not an error worth alarming about.
 *
 * Genre is derived rather than fetched: Spotify tags artists, not tracks, so the
 * modal genre across the top artists is the closest thing to "what you have been
 * listening to" that the API will actually give you.
 */
const modalGenre = (artists: Spotify.TopArtistResponse[]): string | null => {
  const counts = new Map<string, number>();

  artists.forEach((artist) => {
    (artist.genres ?? []).forEach((genre) => counts.set(genre, (counts.get(genre) ?? 0) + 1));
  });

  let best: string | null = null;
  let bestCount = 0;
  counts.forEach((count, genre) => {
    if (count > bestCount) {
      best = genre;
      bestCount = count;
    }
  });

  return best;
};

const getTopItems = async (): Promise<Spotify.TopItemsResponse> => {
  try {
    if (!hasCredentials()) return TOP_ITEMS_OFFLINE;

    const token = await getAccessToken();

    const [artists, tracks] = await Promise.all([
      get<Spotify.TopArtistsResponse>({ path: TOP_ARTISTS_PATH, token }),
      get<Spotify.TopTracksResponse>({ path: TOP_TRACKS_PATH, token }),
    ]);

    const topArtist = artists?.items?.find((artist) => artist.name);
    const topTrack = tracks?.items?.find((track) => track.name);

    // Nothing to show is still a successful call — a new account with no history
    // gets the unavailable shape rather than a row of empty labels.
    if (!topArtist && !topTrack) return TOP_ITEMS_OFFLINE;

    return {
      available: true,
      artist: topArtist
        ? {
            name: topArtist.name ?? "unknown",
            url: topArtist.external_urls?.spotify ?? "https://open.spotify.com",
          }
        : null,
      track: topTrack
        ? {
            title: topTrack.name ?? "unknown",
            artist:
              topTrack.artists?.map((artist) => artist.name).filter(Boolean).join(", ") ||
              "unknown",
            url: topTrack.external_urls?.spotify ?? "https://open.spotify.com",
          }
        : null,
      genre: modalGenre(artists?.items ?? []),
    };
  } catch (error) {
    console.error("[spotify] top-items failed:", error);
    return TOP_ITEMS_OFFLINE;
  }
};

export const spotifyService = {
  getNowPlaying,
  getTopItems,
};
