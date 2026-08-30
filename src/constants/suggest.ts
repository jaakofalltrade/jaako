import { SuggestFailure } from "@/models";
import { ART_HOST } from "./spotify";

/**
 * Fixed values and copy for /lab/suggest.
 *
 * Same split as constants/contact.ts against models/Contact.ts: the enum values are
 * identifiers, so everything a human reads is mapped here.
 *
 * The playlist id is the one value here that a deployment may want to change, and it
 * still lives in this file rather than only in the environment. It is public, it does
 * not change, and a clone should render the real playlist without anybody being told
 * to set a variable first; serverConfig reads SPOTIFY_PLAYLIST_ID over the top of it
 * when there is one.
 */

/**
 * The lab playlist: <https://open.spotify.com/playlist/2CK3Ap0UNSCwatm9cIijx2>
 *
 * "Portfolio Playlist", public, owned by the site's own Spotify account. It exists,
 * so this is the real value rather than a placeholder.
 *
 * A CONSTANT WITH AN ENVIRONMENT OVERRIDE, RATHER THAN AN ENVIRONMENT VARIABLE WITH NO
 * DEFAULT. It is not a secret — it is in the address bar of a public page — and it does
 * not change, so a clone of this repository should render the real playlist without
 * anybody having to be told to set something first. serverConfig still reads
 * SPOTIFY_PLAYLIST_ID over the top of it, which is what a staging deployment would use
 * to avoid test adds landing on the playlist jaako actually listens to.
 */
export const SUGGEST_PLAYLIST_ID = "2CK3Ap0UNSCwatm9cIijx2";

/**
 * Hosts a playlist cover is allowed to come from.
 *
 * Album art is always i.scdn.co, which ART_HOST already covers. A playlist's uploaded
 * cover is not: it comes back on spotifycdn.com with a ROTATING SUBDOMAIN — the same
 * image answered as image-cdn-ak and image-cdn-fa on two consecutive requests — so this
 * one has to be a suffix. The leading dot is the safety: ".spotifycdn.com" cannot be
 * satisfied by "evilspotifycdn.com". See fromHostList in utils/url.ts.
 *
 * next.config.ts has to agree with this, and it does: img-src carries the same pair.
 */
export const PLAYLIST_ART_HOSTS = [ART_HOST] as const;
export const PLAYLIST_ART_SUFFIXES = [".spotifycdn.com"] as const;

/**
 * How long the playlist header is served from memory.
 *
 * The header changes when somebody adds a track, which is rare, and it costs one
 * request per page of items to rebuild because the runtime has to be summed. Five
 * minutes of staleness on a track count is invisible; the alternative is paying for
 * that sum on every page load.
 */
export const PLAYLIST_SUMMARY_TTL_MS = 5 * 60 * 1000;

/**
 * How many pages of durations the runtime sum will walk before it gives up.
 *
 * A hundred items each, so this is two thousand tracks — far past anything this
 * playlist will be. It exists so a paging bug cannot turn one page render into an
 * unbounded loop against Spotify, not because the limit is expected to be reached.
 */
export const PLAYLIST_MAX_PAGES = 20;

/**
 * The display name. Three to ten characters, measured after normalizeDisplayName.
 *
 * Ten is short, and it does not fit "christopher". The field is a signature on
 * somebody else's playlist rather than an identity, and the cap keeps a row's name
 * from running longer than the track title beside it. Three is the floor because a
 * single initial reads as noise on a list of four.
 *
 * NAME_LIMITS.min is also the shortest substring the blocklist checks. A term shorter
 * than the shortest allowed name could never be a name on its own.
 */
export const NAME_LIMITS = { min: 3, max: 10 } as const;

/** Three a day, matching the slot machine's three pulls, so the lab has one number. */
export const DAILY_ADD_CAP = 3;

/**
 * The longest track that can be suggested.
 *
 * Ten minutes stops a forty-minute DJ set or a sleep-noise track being parked on the
 * playlist. It also refuses some legitimately long songs, and the number is a
 * judgement rather than a rule, which is worth saying out loud where it is defined.
 *
 * Free to check: `duration_ms` is already on the track object Spotify returns, so
 * this costs an `if` and not a request.
 */
export const MAX_TRACK_MS = 10 * 60 * 1000;

/** How many search results to show. Enough to find the track, few enough to scan. */
export const SEARCH_LIMIT = 8;

/** A one-character query matches everything and is never a real search. */
export const MIN_QUERY_LENGTH = 2;

/** How long after the last keystroke the search fires. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * How long an identical query is served from memory.
 *
 * Short, because the win comes from the burst rather than the duration: debounced
 * typing generates prefixes and prefixes repeat, so ten people searching the same
 * artist in five minutes is one call to Spotify instead of ten. A longer window would
 * only make a newly released track invisible for longer.
 */
export const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * How many queries the cache holds before the oldest is dropped.
 *
 * A Map that only grows is a leak in a warm process. Map guarantees insertion order,
 * so the oldest key is the first one it yields.
 */
export const SEARCH_CACHE_MAX = 200;

/**
 * The throttle on the search proxy.
 *
 * Generous, because the cache is what actually protects the quota and this only has to
 * stop a naive loop. A person typing "radiohead" with a 300ms debounce fires perhaps
 * four times, so thirty a minute is roughly seven real searches and nowhere near what a
 * human does. Keyed on IP, because the visitor cookie does not exist until somebody's
 * first successful add.
 */
export const SEARCH_RATE = { max: 30, window_ms: 60_000 } as const;

/**
 * How many rows the page actually renders.
 *
 * The read walks every page of the playlist, because the runtime sum needs all of them
 * and the duplicate set does too. Rendering all of them is a different question: the
 * playlist is unbounded by design, and two hundred rows is a page nobody scrolls to the
 * end of. The newest two dozen is the part anybody reads, and the rest is one link away
 * on Spotify, which the card at the top already opens.
 *
 * Only meaningful because tracks go in at position 0. Appending would make this the
 * OLDEST twenty-four, which is the wrong two dozen.
 */
export const QUEUE_SHOWN = 24;

/** How many playlist rows the page reads. One request; see the note on insert position. */
export const QUEUE_READ_LIMIT = 100;

/**
 * The opaque visitor id, and the last name that visitor used.
 *
 * httpOnly, and set only on the first SUCCESSFUL add: somebody who merely reads the
 * playlist is never given a cookie at all. That is what keeps the footer ticker close
 * to honest, and it is why the add route mints the id during the request rather than
 * expecting one to already exist.
 */
export const VISITOR_COOKIE = "jk_visitor";

/** A year. Long enough that a returning visitor keeps their name, short enough to expire. */
export const VISITOR_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365;

/**
 * One sentence per failure, written for the person who hit it.
 *
 * The mirror of VALIDATION_MESSAGE in constants/contact.ts, and the reason no route
 * in this codebase builds an error sentence out of a variable.
 *
 * NameBlocked deliberately does not say what was wrong. Telling somebody exactly
 * which part of their name tripped a filter is a tuning aid for the one person you do
 * not want to help, and everybody else just picks another name.
 */
export const SUGGEST_MESSAGE: Record<SuggestFailure, string> = {
  [SuggestFailure.Malformed]: "That didn't arrive in one piece. Try again.",
  [SuggestFailure.NameRequired]: "Put a name on it.",
  [SuggestFailure.NameTooShort]: `At least ${NAME_LIMITS.min} characters.`,
  [SuggestFailure.NameTooLong]: `${NAME_LIMITS.max} characters at most.`,
  [SuggestFailure.NameBlocked]: "Pick another name.",
  [SuggestFailure.TrackInvalid]: "Couldn't find that track on Spotify.",
  [SuggestFailure.TrackTooLong]: "Anything over ten minutes is too much to ask.",
  [SuggestFailure.Duplicate]: "It's already on there.",
  [SuggestFailure.CapReached]: `That's ${DAILY_ADD_CAP} for today. Come back tomorrow.`,
  [SuggestFailure.NotConfigured]: "The playlist isn't open yet.",
  [SuggestFailure.SpotifyFailed]: "Couldn't add that one. Try again in a minute.",
};
