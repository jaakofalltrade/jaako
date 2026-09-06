import { DeepcutTier } from "@/models";

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

/**
 * Playlists that are the site's own machinery rather than music.
 *
 * "Portfolio Playlist" and "Portfolio Playlist (Local Env)" are what /lab/suggest writes
 * to: one per deployment, holding whatever visitors have added. They are public and
 * owned by the account, so the shelf's filter has no way to tell them from a real
 * playlist - and a pack dealt out of a list other visitors filled is a different app
 * from a pack dealt out of jaako's.
 *
 * BY ID RATHER THAN BY NAME, because a name is editable in the Spotify client and a
 * rename would quietly put the suggestion box back on the shelf. The configured suggest
 * playlist is also excluded dynamically wherever this is used, so a deployment pointed
 * at a third one drops that too without an edit here.
 */
export const EXCLUDED_PLAYLIST_IDS: readonly string[] = [
  // Portfolio Playlist
  "4eJiWoi2LBHIxFq2JqDvlo",
  // Portfolio Playlist (Local Env)
  "2CK3Ap0UNSCwatm9cIijx2",
];

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
 * this page can render, and the rung it lands on is a whole band wide.
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

/* ---------------- the draw ----------------

   THESE ARE LIVE. utils/packDraw.ts deals against them and server/deepcuts/rip.ts writes
   the result down. They are also what the chance on each card is computed from, which is
   why that figure is a projection from the model rather than a count of rips: it says
   what the draw WOULD do, and the draw does exactly that. */

/** Five cards to a pack. */
export const PACK_SIZE = 5;

/**
 * Four of the five come off the playlist uniformly and are whatever they are.
 *
 * The fifth is the hit slot below. Four and one rather than five uniform draws is what
 * puts the pull rate under this app's control instead of the playlist's: rip a list of
 * obscurities with five uniform draws and every card is a pull, which makes the rare
 * rungs worthless exactly where they should mean most.
 */
export const COMMON_SLOTS = PACK_SIZE - 1;

/**
 * What the hit slot rolls, and it never rolls a common rung.
 *
 * A GUARANTEED FLOOR OF "ALBUM CUT OR BETTER", which is how a physical pack works: the
 * commons fill it and one slot is the reason you opened it.
 *
 * The five weights sum to 1 and run rarest-last, so `lost` at one percent is a genuine
 * chase card: at one pack a day it is the thick end of three months. When a rolled rung
 * has no track on the playlist the slot walks DOWN the ladder to the nearest rung that
 * does, never up - falling upward would hand out rarer cards than the playlist has
 * earned, which is the one direction that makes the whole ladder meaningless.
 *
 * Starting weights, not measurements. Borrowed from how a physical pack feels.
 */
export const HIT_SLOT_ODDS: Partial<Record<DeepcutTier, number>> = {
  [DeepcutTier.Album]: 0.46,
  [DeepcutTier.Deepcut]: 0.32,
  [DeepcutTier.Unheard]: 0.15,
  [DeepcutTier.Ghost]: 0.06,
  [DeepcutTier.Lost]: 0.01,
};

/* ---------------- shiny ---------------- */

/**
 * The chance a card comes out shiny, rolled per rung AFTER the rung is decided.
 *
 * A SECOND, INDEPENDENT ROLL, WHICH IS THE WHOLE IDEA. Shiny is not a rung and does not
 * sit on the ladder: it is a finish on a card that already has one. Pull a ghost and it
 * is a ghost; the shiny roll then decides whether it is a shiny ghost. That is how a
 * physical set works, and it is why this is a separate table rather than three more
 * entries in DEEPCUT_TIER_FLOOR.
 *
 * ONLY THE THREE RAREST CAN BE SHINY. A shiny chart hit would be a special finish on the
 * card you were going to throw back, which spends the effect on the wrong end of the
 * ladder. Rungs absent from this table never roll.
 *
 * The odds fall as the rung gets rarer, so the two rolls compound: a shiny lost is the
 * rarest thing the app can produce by some distance. At one pack a day it is not a card
 * anybody should expect to see.
 *
 * ROLLED BY drawPack, ONCE THE RUNG IS DECIDED, and printed by the cards tab. One
 * constant for both, because inventing the number at the point of use is how it ends up
 * different in the copy and in the code.
 */
export const SHINY_ODDS: Partial<Record<DeepcutTier, number>> = {
  [DeepcutTier.Unheard]: 0.01,
  [DeepcutTier.Ghost]: 0.005,
  [DeepcutTier.Lost]: 0.0025,
};

/* ---------------- opening one, as a sequence ----------------

   The rip is four beats rather than a state change, and the timings are here rather than
   in the component so the whole sequence can be read as one thing. They are milliseconds
   and they add up: the pack comes forward, tears, flashes, and the cards arrive. */

/** The pack scales up and settles before anything happens to it. */
export const RIP_FORWARD_MS = 260;

/** The top of the wrapper comes away. The longest beat, because it is the one being watched. */
export const RIP_TEAR_MS = 420;

/** White, and brief. Long enough to hide the swap from pack to cards, short enough not to blind. */
export const RIP_FLASH_MS = 260;

/**
 * How many sparkles come off the pack, and how long one lives.
 *
 * TWENTY IS A BURST AND NOT A SNOWSTORM. Each is an animated element with its own
 * transform, so the count is a frame budget as much as a look: this many is comfortably
 * inside a frame on a phone, and three times as many would be a particle system asking
 * for a canvas.
 *
 * THE LIFETIME OUTLASTS THE FLASH ON PURPOSE. The flash is over in 260ms, which is about
 * how long a swap should be hidden for. Sparkles that ended with it would look like part
 * of the same white wipe; running on for three times as long means they are still in the
 * air while the first cards land, and the burst reads as coming OFF the cards rather than
 * covering them.
 */
export const SPARKLE_COUNT = 20;
export const SPARKLE_MS = 780;

/**
 * The floor on the whole sequence, and the reason it is a floor rather than a total.
 *
 * The animation and the network request start together and the cards cannot appear until
 * BOTH are done. On a warm cache the request beats the animation and this is what the
 * visitor waits for; on a cold playlist the request is slower and the animation waits
 * instead, holding on the flash rather than cutting to cards halfway through a tear.
 */
export const RIP_SEQUENCE_MS = RIP_FORWARD_MS + RIP_TEAR_MS + RIP_FLASH_MS;

/* ---------------- the collection ---------------- */

/**
 * How many cards the collection tab reads back.
 *
 * A RENDERING LIMIT, NOT A RULE ABOUT COLLECTING. Nothing is deleted and nothing stops
 * being yours at two hundred; this is the point past which one query behind one page
 * returning every row it finds stops being a good idea. A visitor ripping daily for a
 * year has eighteen hundred cards, and a page that renders eighteen hundred card faces
 * with artwork on each is a page that takes a second to paint.
 *
 * Rarest first, so the cap cuts the common end - which is the right end to lose. Somebody
 * past this many cards is missing chart hits from the bottom of their binder, never the
 * ghost they are here to look at.
 */
export const COLLECTION_LIMIT = 200;
