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
 * How long any single call to Spotify is allowed to take before it is abandoned.
 *
 * A CEILING ON A HANG, NOT A PERFORMANCE TARGET. Spotify answers in well under a
 * second; nothing here is expected to come close. What this exists for is the request
 * that never answers at all - a stalled connection, a DNS timeout, a host that accepted
 * the socket and went quiet. Without it a fetch rides the runtime's own default, which
 * is measured in minutes, and every caller above it waits that long.
 *
 * Eight seconds is generous enough that a slow-but-working network is never cut off,
 * and short enough that a visitor gets the offline card instead of a page that appears
 * to be broken.
 *
 * It is a budget per REQUEST rather than per operation, so a call that mints a token
 * and then retries a 401 can in principle spend it several times over. That is the
 * uninteresting worst case: a 401 arriving at all means the network is working, and the
 * hang this guards against does not compound.
 */
export const SPOTIFY_TIMEOUT_MS = 8_000;

/**
 * The panel renders the cover at 76px, so the ~300px image is the right pick and
 * the 640px original is wasted bytes.
 */
export const PREFERRED_ART_WIDTH = 300;

/** Spotify's image CDN. Anything else is refused rather than put in an <img src>. */
export const ART_HOST = "i.scdn.co";

/**
 * The only host a track or artist link is allowed to point at. The counterpart to
 * ART_HOST above: one names the CDN we will load an image from, this names the site
 * we will send a visitor to.
 */
export const SPOTIFY_LINK_HOST = "open.spotify.com";

/**
 * Where a track or artist link points when Spotify's payload carries no external
 * URL of its own, or carries one that fails the host check. Spotify's own home page:
 * not the right record, but a working link into the right app, which is better than
 * a dead href on a row that renders.
 */
export const SPOTIFY_WEB_URL = `https://${SPOTIFY_LINK_HOST}`;

/** The badge above the track name, per playback state. */
export const PLAYBACK_BADGE: Record<
  Spotify.PlaybackStatus,
  { label: string; tone: BadgeTone }
> = {
  [Spotify.PlaybackStatus.Playing]: { label: "now playing", tone: BadgeTone.Cyan },
  [Spotify.PlaybackStatus.Recent]: { label: "last played", tone: BadgeTone.Steel },
  [Spotify.PlaybackStatus.Offline]: { label: "offline", tone: BadgeTone.Ghost },
};

/** Shown before the first response lands — not a playback state, so it isn't in the enum. */
export const LOADING_BADGE = { label: "tuning in", tone: BadgeTone.Steel };

/**
 * The line above the track in the minimised player, per playback state.
 *
 * Separate from PLAYBACK_BADGE rather than reusing it, because the two are saying
 * different things. The badge is an instrument reading — "now playing", "offline" —
 * and it labels the panel. This is the panel talking about its owner in the first
 * person, which is the only place on the site that does, and it is what makes the
 * pill legible at a glance to somebody who has not worked out what the widget is.
 *
 * OFFLINE NEEDS ITS OWN SENTENCE and does not get "offline". A player that says
 * offline reads as broken — as though the widget failed rather than the man stopped
 * playing music. Naming him instead puts the silence where it belongs.
 */
export const PEEK_STATUS: Record<Spotify.PlaybackStatus, string> = {
  [Spotify.PlaybackStatus.Playing]: "i'm currently listening to",
  [Spotify.PlaybackStatus.Recent]: "i was last listening to",
  [Spotify.PlaybackStatus.Offline]: "i'm not listening to anything",
};

/** Before the first response lands. Same slot, same reason it isn't in the enum. */
export const PEEK_LOADING = "checking the turntable";

/**
 * What stands in for the title and artist when there is no track.
 *
 * Two lines because the layout has two, and leaving the second empty would collapse
 * the pill to a different height depending on whether music is playing — which is the
 * one thing a permanently-visible element must not do.
 */
export const PEEK_OFFLINE_LINES = {
  title: "silence, deliberately",
  artist: "back when the coffee lands",
} as const;

/* ---------------- when the panel asks again ---------------- */

/**
 * Added to the time left on a track so the refetch lands just after the change
 * rather than on top of it. The two clocks disagree, and Spotify samples
 * progress_ms rather than deriving it live.
 */
export const DRIFT_MS = 2000;

/** Floor. Without it, a short interlude or rapid skipping becomes a request storm. */
export const MIN_REFETCH_MS = 10_000;

/**
 * How long the panel waits before asking again when nothing is playing.
 *
 * THIS IS THE NUMBER THAT KEEPS THE PANEL ALIVE BETWEEN SONGS, and it is why the
 * one-request-per-song schedule needs a second number at all. That schedule is
 * derived from the time remaining on the current track, so it can only be drawn
 * while there is a current track to derive it from. A paused player, a finished
 * queue, a podcast, and a fetch that failed once all report no playing track, and
 * every one of them used to leave nothing scheduled at all — the panel then sat on
 * whatever song it last saw until somebody pressed refresh or reloaded the page.
 *
 * Thirty seconds because it is the s-maxage below: an idle panel behind the CDN
 * costs one upstream call per half minute however many people have the page open.
 * It is also about the resolution the answer deserves — "what is he listening to"
 * does not need a finer one.
 */
export const IDLE_REFETCH_MS = 30_000;

export const NOW_PLAYING_CACHE_HEADERS = {
  // s-maxage lets a CDN absorb traffic spikes; max-age=0 keeps the browser out of
  // it, since the refresh button is the only intended way to update the panel and
  // a heuristically cached response would defeat it.
  "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
} as const;

/* ---------------- listening statistics ---------------- */

/** Roughly the last four weeks. Spotify's other ranges are 6 months and all-time. */
export const TOP_TIME_RANGE = "short_term";

/** Enough artists to make the modal genre meaningful without paying for a big response. */
export const TOP_ARTIST_LIMIT = 10;

/** Only the first is shown; the rest exist so a tie in genre can be broken. */
export const TOP_TRACK_LIMIT = 1;

/** What the cell renders before the user-top-read scope has been granted. */
export const TOP_ITEMS_OFFLINE: Spotify.TopItemsResponse = {
  available: false,
  artist: null,
  track: null,
  genre: null,
};

export const TOP_ITEMS_CACHE_HEADERS = {
  // Top items move over weeks, not seconds. Nothing like now-playing's 30s: this can
  // sit in a CDN for hours and still be perfectly current.
  "Cache-Control": "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400",
} as const;
