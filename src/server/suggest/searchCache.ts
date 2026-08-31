import "server-only";
import { SEARCH_CACHE_MAX, SEARCH_CACHE_TTL_MS, SEARCH_RATE } from "@/constants";
import type { SearchResult } from "@/models";
import { getEpochMilliseconds } from "@/oras/milliseconds";

/**
 * The two guards on the search proxy: a cache, and a throttle.
 *
 * That route is public, unauthenticated, and spends the same Spotify token the
 * now-playing dock uses, so an open proxy here could take the homepage panel down with
 * it. These are what stop that.
 *
 * THE CACHE IS THE BIGGER OF THE TWO, which is not the obvious way round. A throttle
 * caps how fast one person can waste your quota; the cache stops the waste existing.
 * Debounced typing generates PREFIXES, and prefixes repeat both within one person's
 * session and across everyone searching the same artist, so ten people looking for
 * radiohead in five minutes is one call to Spotify rather than ten.
 *
 * BOTH ARE PER-INSTANCE, AND THAT IS FINE FOR ONE OF THEM AND WEAK FOR THE OTHER. A
 * cold cache costs one extra request, which is a performance property. A cold throttle
 * costs a fraction of its limit, which is a correctness property, and a serverless
 * fan-out weakens it. It is accepted for now: the throttle is the second line, and it
 * can move to Postgres in the same shape as the daily cap the day it matters. The
 * daily cap itself was never allowed to live here for exactly this reason.
 *
 * Both are factory closures, the same arrangement as the token cache in
 * server/spotify/spotifyAccessTokens.ts, so swapping either for a shared store replaces one function.
 */

const createSearchCache = () => {
  const entries = new Map<string, { results: SearchResult[]; expires_at: number }>();

  return {
    read: (args: { key: string }): SearchResult[] | null => {
      const hit = entries.get(args.key);
      if (!hit) return null;

      // Evicted lazily on read rather than swept: the only moment staleness matters is
      // the moment somebody asks, and a timer would keep the process awake.
      if (hit.expires_at <= getEpochMilliseconds.now()) {
        entries.delete(args.key);
        return null;
      }

      return hit.results;
    },

    write: (args: { key: string; results: SearchResult[] }) => {
      const { key, results } = args;

      // A Map that only grows is a leak in a warm process. Map guarantees insertion
      // order, so the first key it yields is the oldest one written.
      if (entries.size >= SEARCH_CACHE_MAX && !entries.has(key)) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }

      entries.set(key, { results, expires_at: getEpochMilliseconds.now() + SEARCH_CACHE_TTL_MS });
    },
  };
};

/**
 * A sliding window per key, pruning as it goes, which doubles as garbage collection for
 * that key. The same shape as server/contact/rateLimiter.ts, and the note there about
 * a client-settable x-forwarded-for applies here too: this only has to stop a naive
 * loop, and the cache is what makes the rest affordable.
 */
const createSearchThrottle = () => {
  const hits = new Map<string, number[]>();

  return {
    allow: (args: { key: string }): boolean => {
      const { key } = args;
      const now = getEpochMilliseconds.now();
      const recent = (hits.get(key) ?? []).filter((at) => now - at < SEARCH_RATE.window_ms);

      if (recent.length >= SEARCH_RATE.max) {
        hits.set(key, recent);
        return false;
      }

      /* BOUNDED, LIKE THE CACHE ABOVE IT. Timestamps are pruned only for a key that is
         asked about again, so a key never seen twice keeps its entry for the life of
         the process. One permanent entry per distinct address, on a public route hit
         on every keystroke, is a leak with a queue of visitors feeding it. Map yields
         insertion order, so the first key out is the least recently created. */
      if (hits.size >= SEARCH_RATE.keys && !hits.has(key)) {
        const oldest = hits.keys().next().value;
        if (oldest !== undefined) hits.delete(oldest);
      }

      hits.set(key, [...recent, now]);
      return true;
    },
  };
};

export const searchCache = createSearchCache();
export const searchThrottle = createSearchThrottle();

/**
 * How a query becomes a cache key.
 *
 * Trimmed and lowercased, so three spellings of the same search are one entry. Exported
 * rather than inlined because the route has to key the cache the same way it decides a
 * query is long enough to run, and doing that in two places is how they drift.
 */
export const searchKey = (q: string): string => q.trim().toLowerCase();
