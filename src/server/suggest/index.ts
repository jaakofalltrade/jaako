import "server-only";
import { spotifyService } from "@/server/spotify";
import { blocklist } from "./blocklist";
import { hasStore, namesByUri, record, releaseAdd, reserveAdd } from "./store";
import { searchCache, searchKey, searchThrottle } from "./searchCache";
import { validate } from "./validate";

/**
 * `import { suggestService } from "@/server/suggest"`.
 *
 * Assembled here rather than exported piecemeal because the add route walks the whole
 * sequence in order — configured, validate, reserve, write, record — and the object is
 * what makes that sequence readable at the call site. Same arrangement as
 * server/contact/index.ts.
 *
 * The store is lifted out rather than passed along: a route has no business holding a
 * database handle, only asking it a question.
 */

/**
 * Whether an add can be attempted at all.
 *
 * Both halves, because either one missing means the same thing to a visitor and a
 * different thing to whoever has to fix it. The route logs which; the page says the
 * playlist is not open yet.
 */
const isConfigured = (): boolean => spotifyService.playlist.canWrite() && hasStore();

/** What is missing, for the server log. Never for the response. */
const missingConfig = (): string[] =>
  [
    spotifyService.playlist.canWrite() ? null : "SPOTIFY_WRITE_REFRESH_TOKEN",
    hasStore() ? null : "DATABASE_URL",
  ].filter((name): name is string => Boolean(name));

export const suggestService = {
  isConfigured,
  missingConfig,
  validate,
  blocks: blocklist.blocks,
  reserveAdd,
  releaseAdd,
  record,
  namesByUri,
  searchCache,
  searchThrottle,
  searchKey,
};
