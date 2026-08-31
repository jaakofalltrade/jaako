import { MIN_QUERY_LENGTH } from "@/constants";
import { HttpStatus } from "@/models";
import type { SearchResponse } from "@/models";
import { spotifyService } from "@/server/spotify";
import { suggestService } from "@/server/suggest";
import { clientIp } from "@/server/clientIp";

// Reads request headers for the throttle key, so nothing here may be lifted to build
// time or served from a shared cache.
export const dynamic = "force-dynamic";

const json = (args: { body: SearchResponse; status: HttpStatus }) =>
  Response.json(args.body, { status: args.status });

/**
 * The search proxy.
 *
 * PUBLIC, UNAUTHENTICATED, AND IT SPENDS THE SAME SPOTIFY TOKEN THE HOMEPAGE DOCK
 * USES, which is the whole reason it is guarded at all. Burning the quota here takes
 * the now-playing panel down with it.
 *
 * The browser cannot call Spotify directly: next.config.ts sets connect-src 'self', so
 * a fetch from the page would be blocked by the CSP with no visible error. That is why
 * this route exists rather than a client-side call with a public token.
 *
 * EVERY FAILURE IS AN EMPTY RESULT SET, NOT AN ERROR. This is a read, and reads
 * degrade: a search that finds nothing and a search that could not run look the same
 * to somebody typing, and the page already has copy for an empty result. The route
 * that writes is the one that refuses out loud.
 */
export const GET = async (request: Request) => {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();

  // A one-character query matches most of Spotify and is never a real search. Checked
  // before the throttle, so a keystroke on the way to a real query costs nothing.
  if (q.length < MIN_QUERY_LENGTH) return json({ body: { results: [] }, status: HttpStatus.Ok });

  /*
   * THROTTLE BEFORE CACHE, WHICH IS THE ORDER WORTH ARGUING ABOUT. A cached hit still
   * spends throttle budget, because this is protecting the invocation count of a
   * function somebody else pays for, not only Spotify's rate limit. Serving a thousand
   * cached responses a second is cheap for Spotify and not cheap here.
   */
  if (!suggestService.searchThrottle.allow({ key: clientIp(request) })) {
    return json({ body: { results: [] }, status: HttpStatus.TooManyRequests });
  }

  const key = suggestService.searchKey(q);

  const cached = suggestService.searchCache.read({ key });
  if (cached) return json({ body: { results: cached }, status: HttpStatus.Ok });

  try {
    const results = await spotifyService.playlist.search({ q });
    suggestService.searchCache.write({ key, results });
    return json({ body: { results }, status: HttpStatus.Ok });
  } catch (error) {
    console.error("[suggest] search failed:", error);
    return json({ body: { results: [] }, status: HttpStatus.Ok });
  }
};
