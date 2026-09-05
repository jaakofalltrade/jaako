import { HttpStatus } from "@/models";
import type { PackContents } from "@/models";
import { packContents } from "@/server/deepcuts/packContents";
import { spotifyService } from "@/server/spotify";
import { clientIp } from "@/server/clientIp";
import { suggestService } from "@/server/suggest";

// Reads request headers for the throttle key, so nothing here may be lifted to build
// time or served from a shared cache.
export const dynamic = "force-dynamic";

/**
 * What is inside one pack, for the panel /lab/deepcuts opens when a pack is clicked.
 *
 * PUBLIC AND UNAUTHENTICATED, LIKE THE SEARCH PROXY, AND GUARDED FOR THE SAME REASON
 * PLUS A WORSE ONE. It spends the same Spotify token the homepage dock uses, so burning
 * the quota here takes the now-playing panel down with it - and unlike search, one call
 * here can also fan out to fifty last.fm requests. An unthrottled version of this route
 * is a way to spend somebody else's rate limit fifty times per request.
 *
 * THE PLAYLIST ID IS CHECKED AGAINST THE SHELF RATHER THAN TRUSTED. Without that, this
 * is an open proxy for reading any playlist on Spotify through jaako's token: the id
 * arrives from the browser, and the browser is not our page. The shelf is the list of
 * playlists this site has already chosen to make public, so it is exactly the right
 * allowlist - and it costs nothing, because it is cached and the page just rendered it.
 *
 * The browser cannot call Spotify or last.fm directly: next.config.ts sets
 * connect-src 'self', so either fetch would be blocked by the CSP with no visible
 * error. That is why this route exists at all.
 */
export const GET = async (request: Request) => {
  const id = (new URL(request.url).searchParams.get("id") ?? "").trim();

  if (!id) return Response.json({ error: "missing id" }, { status: HttpStatus.BadRequest });

  /* Shares the search proxy's throttle bucket rather than getting its own. Both routes
     spend the same Spotify token, and what is being protected is that token and the
     invocation count - not either route's own fairness. */
  if (!suggestService.searchThrottle.allow({ key: clientIp(request) })) {
    return Response.json({ error: "slow down" }, { status: HttpStatus.TooManyRequests });
  }

  /* The allowlist. A playlist that is not on the shelf is not one this site publishes,
     whatever the browser asked for. Answering 404 rather than 403 on purpose: whether a
     given id exists on somebody's private library is not this route's news to break. */
  const shelf = await spotifyService.library.playlists();
  if (!shelf?.some((playlist) => playlist.id === id)) {
    return Response.json({ error: "no such pack" }, { status: HttpStatus.NotFound });
  }

  const contents = await packContents({ playlist_id: id });

  if (!contents) {
    return Response.json({ error: "could not read the pack" }, { status: HttpStatus.BadGateway });
  }

  const body: PackContents = contents;
  return Response.json(body, { status: HttpStatus.Ok });
};
