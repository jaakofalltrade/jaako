import { Env, HttpStatus } from "@/models";
import type { RipResponse } from "@/models";
import { DEEPCUTS_TEASER } from "@/data/lab";
import { ripPack } from "@/server/deepcuts/rip";
import { spotifyService } from "@/server/spotify";
import { clientIp } from "@/server/clientIp";
import { suggestService } from "@/server/suggest";
import { serverConfig } from "@/server/serverConfig";
import { mintVisitor, readVisitor, visitorCookie } from "@/server/visitor";

// Reads a cookie and writes one. Nothing here may be prerendered or cached.
export const dynamic = "force-dynamic";

/**
 * Opening a pack.
 *
 * POST RATHER THAN GET, AND THAT IS NOT A FORMALITY. A rip mints a visitor id, writes
 * rows to two tables and is the thing the site's own counters are built on. A GET that
 * did all that would be fetched by every prefetcher, link previewer and crawler that
 * ever saw the URL.
 *
 * IT IS STILL IDEMPOTENT FOR A DAY, which is the interesting part. The draw is seeded on
 * the visitor, the playlist and the date, so posting twice deals the same five cards.
 * What is not idempotent is the tally: each post writes a row. That is deliberate - a
 * second post is a second time somebody opened the pack, and "most opened" is counting
 * openings rather than distinct packs.
 *
 * THE PLAYLIST ID IS CHECKED AGAINST THE SHELF, exactly as the pack route does. Without
 * it this is an open proxy for reading any playlist on Spotify through jaako's token,
 * with a database write attached.
 */
export const POST = async (request: Request) => {
  const id = (new URL(request.url).searchParams.get("id") ?? "").trim();

  const refuse = (error: string, status: HttpStatus) =>
    Response.json({ playlist_id: id, cards: [], error } satisfies RipResponse, { status });

  if (!id) return refuse(DEEPCUTS_TEASER.rip_failed, HttpStatus.BadRequest);

  /* Shares the search proxy's throttle bucket. What is being protected is the Spotify
     token and the invocation count, not either route's own fairness - and this one can
     also fan out to fifty last.fm requests and write six rows. */
  if (!suggestService.searchThrottle.allow({ key: clientIp(request) })) {
    return refuse(DEEPCUTS_TEASER.rip_throttled, HttpStatus.TooManyRequests);
  }

  const shelf = await spotifyService.library.playlists();
  if (!shelf?.some((playlist) => playlist.id === id)) {
    return refuse(DEEPCUTS_TEASER.rip_failed, HttpStatus.NotFound);
  }

  /* Minted here when the browser has none, so the first rip is dealt against an id the
     visitor does not have yet and the Set-Cookie rides out with the response. Same
     shape the add route uses, and the same consequence: somebody who only looks at the
     shelf is never given a cookie. */
  const visitor = readVisitor({ request }) ?? mintVisitor();

  let cards;
  try {
    cards = await ripPack({ playlist_id: id, visitor_id: visitor.id });
  } catch (error) {
    console.error("[deepcuts] rip failed:", error);
    return refuse(DEEPCUTS_TEASER.rip_failed, HttpStatus.BadGateway);
  }

  /* Null means there was nothing to deal from: Spotify unreachable, or a playlist where
     last.fm matched nothing. Both are a pack that cannot be opened rather than an empty
     pack, and the visitor gets told which. */
  if (!cards) return refuse(DEEPCUTS_TEASER.rip_unscoreable, HttpStatus.BadGateway);

  const body: RipResponse = { playlist_id: id, cards };

  return Response.json(body, {
    status: HttpStatus.Ok,
    headers: {
      /* SECURE COMES FROM THE DEPLOYMENT, NOT THE REQUEST URL, which is the mistake the
         add route already wrote down: behind a proxy that terminates TLS, request.url is
         http on an https site and the cookie goes out without Secure exactly where it
         matters most. The environment is the thing that actually knows. */
      "Set-Cookie": visitorCookie({
        visitor: { id: visitor.id, name: visitor.name },
        secure: serverConfig.env !== Env.Local,
      }),
    },
  });
};
