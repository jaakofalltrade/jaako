import { HttpStatus } from "@/models";
import { packContents } from "@/server/deepcuts/packContents";
import { spotifyService } from "@/server/spotify";
import { clientIp } from "@/server/clientIp";
import { suggestService } from "@/server/suggest";

// Reads request headers for the throttle key, so nothing here may be lifted to build
// time or served from a shared cache.
export const dynamic = "force-dynamic";

/**
 * Scores a playlist into the cache, and answers nothing.
 *
 * WHY A ROUTE THAT RETURNS NO BODY EXISTS. Opening a pack used to fetch its whole scored
 * track list, and the panel printed it. That went: a sealed pack shows nothing of what is
 * inside it, so there was nothing left for the response to render. But the scoring itself
 * was doing a second job - filling the six-hour play-count cache, so that when the rip
 * came it landed inside the tear animation instead of after it.
 *
 * This is that second job with the first one removed. The shelf fires it when a pointer
 * enters a pack, the work happens, the cache fills, and the browser is told only that it
 * worked. By the time anybody clicks and rips, last.fm has already been asked.
 *
 * IT IS A GET AND IT WRITES NOTHING OF OURS. The only thing it changes is a process-local
 * cache, so a prefetcher or a crawler firing it costs a warm cache and nothing else -
 * which is the same outcome as it being fired on purpose. That is why it does not need
 * the POST the rip does.
 *
 * THE GUARDS ARE THE ONES THE OLD ROUTE HAD, and they are not decoration. It spends the
 * same Spotify token the homepage dock uses, so burning the quota here takes the
 * now-playing panel down with it, and one call can fan out to fifty last.fm requests. An
 * unthrottled version is a way to spend somebody else's rate limit fifty times per
 * request, and an unchecked id is an open proxy for reading any playlist on Spotify
 * through the owner's token.
 *
 * A FAILURE IS NOT WORTH REPORTING. Nothing is rendered from this, so a cold cache is the
 * only consequence of it going wrong - the rip does the scoring itself if this never ran.
 * Every path answers 204 except the ones that protect something.
 */
export const GET = async (request: Request) => {
  const id = (new URL(request.url).searchParams.get("id") ?? "").trim();

  if (!id) return new Response(null, { status: HttpStatus.BadRequest });

  /* Shares the search proxy's throttle bucket. What is being protected is the Spotify
     token and the last.fm key, not either route's own fairness. */
  if (!suggestService.searchThrottle.allow({ key: clientIp(request) })) {
    return new Response(null, { status: HttpStatus.TooManyRequests });
  }

  /* The allowlist. A playlist that is not on the shelf is not one this site publishes,
     whatever the browser asked for. Answering 404 rather than 403 on purpose: whether a
     given id exists on somebody's private library is not this route's news to break. */
  const shelf = await spotifyService.library.playlists();
  if (!shelf?.some((playlist) => playlist.id === id)) {
    return new Response(null, { status: HttpStatus.NotFound });
  }

  await packContents({ playlist_id: id });

  return new Response(null, { status: HttpStatus.NoContent });
};
