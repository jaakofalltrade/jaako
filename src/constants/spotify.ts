import { BadgeTone, Spotify } from "@/models";

/**
 * Fixed values for the now_playing panel. Deliberately not in ServerConfig —
 * none of these change per deployment, and putting them there would imply they do.
 */

/** What the panel renders when credentials are missing or Spotify is unreachable. */
export const OFFLINE_RESPONSE: Spotify.NowPlayingResponse = {
  status: Spotify.PlaybackStatus.Offline,
  track: null,
  recent: [],
};

/** How many plays to ask Spotify for. */
export const RECENT_LIMIT = 4;

/** How many to show under the hero track. One fewer, so the list never repeats it. */
export const RECENT_SHOWN = 3;

/**
 * Access tokens live an hour. Expiry is pulled this far forward so a request
 * never races the boundary.
 */
export const TOKEN_EXPIRY_MARGIN_MS = 60_000;

/**
 * The panel renders the cover at 76px, so the ~300px image is the right pick and
 * the 640px original is wasted bytes.
 */
export const PREFERRED_ART_WIDTH = 300;

/** Spotify's image CDN. Anything else is refused rather than put in an <img src>. */
export const ART_HOST = "i.scdn.co";

/** The badge above the track name, per playback state. */
export const PLAYBACK_BADGE: Record<
  Spotify.PlaybackStatus,
  { label: string; tone: BadgeTone }
> = {
  [Spotify.PlaybackStatus.Playing]: { label: "now playing", tone: BadgeTone.Green },
  [Spotify.PlaybackStatus.Recent]: { label: "last played", tone: BadgeTone.Void },
  [Spotify.PlaybackStatus.Offline]: { label: "offline", tone: BadgeTone.Void },
};

/** Shown before the first response lands — not a playback state, so it isn't in the enum. */
export const LOADING_BADGE = { label: "tuning in", tone: BadgeTone.Steel };

export const NOW_PLAYING_CACHE_HEADERS = {
  // s-maxage lets a CDN absorb traffic spikes; max-age=0 keeps the browser out of
  // it, since the refresh button is the only intended way to update the panel and
  // a heuristically cached response would defeat it.
  "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
} as const;
