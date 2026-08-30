import { SuggestFailure } from "@/models";

/**
 * Fixed values and copy for /lab/suggest.
 *
 * Same split as constants/contact.ts against models/Contact.ts: the enum values are
 * identifiers, so everything a human reads is mapped here. None of these vary by
 * deployment, which is why they are not in ServerConfig. The one value that does vary
 * is the playlist id, and that is why it is the exception.
 */

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
