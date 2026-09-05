/**
 * Fixed values for /lab/deepcuts.
 *
 * Its own file rather than more rows in constants/lab.ts, which holds the lab's
 * catalogue — status badges and the rarity ladder, both of which the INDEX renders.
 * These are about one app talking to Spotify, and they belong beside the suggest
 * numbers in spirit if not in file.
 *
 * The scoring thresholds are not here and are not anywhere. They are the tuning
 * constants docs/lab.md leaves open, they will move the first time real play counts
 * are seen, and inventing five bands now would be the page telling a story the data
 * has not told yet.
 */

/**
 * How many playlists to ask for per page.
 *
 * Spotify's own ceiling for GET /me/playlists is 50, so this is the largest legal
 * value rather than a preference. Asking for fewer would only mean more round trips
 * for the same library.
 */
export const LIBRARY_READ_LIMIT = 50;

/**
 * How many pages the library walk will follow before it stops.
 *
 * Five hundred playlists, which is far past anything this account holds. It exists so
 * a paging bug cannot turn one page render into an unbounded loop against Spotify —
 * the same guard PLAYLIST_MAX_PAGES is for the suggest read, and the same reason it is
 * not a limit anybody expects to reach.
 */
export const LIBRARY_MAX_PAGES = 10;

/**
 * How long the shelf is served from memory.
 *
 * LONGER THAN THE SUGGEST HEADER'S FIVE MINUTES, because it answers a slower question.
 * That one changes whenever a visitor adds a track, which is the whole point of the
 * page it sits on. This one changes when jaako makes a playlist or makes one public,
 * which is a thing that happens on the scale of weeks.
 *
 * The cost of being wrong is also smaller: a stale track count on a pack is a number
 * off by a few, not a list missing the song somebody just added.
 */
export const LIBRARY_TTL_MS = 15 * 60 * 1000;

/**
 * How many packs are on one page of the shelf.
 *
 * Nine, which is three rows of the three-column grid the shelf draws at its own width.
 * That is the number rather than a round ten because the grid is what a reader sees:
 * ten would leave a row of one hanging under three full ones on every page but the
 * last, which is the shape a pager exists to avoid.
 *
 * The column count is a media query and this is not, so the two can disagree on a phone
 * — nine packs is four and a half rows at two columns. That is the right way round: the
 * page size stays a fixed, predictable number of things, and the layout is free to
 * arrange them.
 */
export const PACKS_PER_PAGE = 9;

/* ---------------- last.fm ---------------- */

/**
 * last.fm's endpoint. Every method is a query parameter on this one path.
 *
 * Here rather than in src/server/endpoints.ts because that file is Spotify's paths and
 * carries `server-only`, and because last.fm has exactly one URL rather than a family
 * of them. If this ever grows a second method it belongs beside the Spotify builders.
 */
export const LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/";

/** The same ceiling on a hang the Spotify calls take, and for the same reason. */
export const LASTFM_TIMEOUT_MS = 8_000;

/**
 * How long a global play count is held.
 *
 * SIX HOURS, WHICH IS THE LONGEST TTL IN THE REPO AND THE EASIEST TO JUSTIFY. This is a
 * count of every scrobble on last.fm for one track since it was first uploaded. A song
 * with four million plays does not become a song with four million and one in any sense
 * this page can render, and the rung it lands on is a whole order of magnitude wide.
 */
export const PLAY_COUNT_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * How many tracks of a playlist are scored when a pack is opened.
 *
 * A CEILING ON A FAN-OUT, WHICH IS THE THING THAT MAKES THIS SAFE TO DO ON A CLICK. One
 * last.fm request per track, and the biggest playlist on the account has 325 songs. A
 * cold cache at that size would be 325 outbound requests to fill one panel.
 *
 * Fifty is enough to show what a playlist is made of and to give a pack something
 * honest to be dealt from later. The panel says it is showing the first fifty rather
 * than pretending it scored everything.
 */
export const SCORED_TRACK_LIMIT = 50;

/**
 * How many of those are scored at once.
 *
 * The counts are cached for six hours, so this only bites on a cold playlist - but a
 * cold one would otherwise open fifty sockets at once, and last.fm rate-limits per key.
 * Ten at a time keeps the panel under a second on a warm cache and polite on a cold one.
 */
export const SCORING_CONCURRENCY = 10;
