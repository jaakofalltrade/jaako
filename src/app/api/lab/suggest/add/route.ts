import {
  DAILY_ADD_CAP,
  MAX_BODY_BYTES,
  MAX_TRACK_MS,
  SUGGEST_MESSAGE,
} from "@/constants";
import { Env, HttpStatus, SuggestFailure } from "@/models";
import type { AddResponse, QueueEntry } from "@/models";
import { serverConfig } from "@/server/serverConfig";
import { playlistService } from "@/server/spotify";
import { suggestService } from "@/server/suggest";
import { mintVisitor, readVisitor, visitorCookie } from "@/server/visitor";

// Reads a cookie and writes one. Nothing here may be prerendered or cached.
export const dynamic = "force-dynamic";

/**
 * The one write in the app.
 *
 * WRITES REFUSE OUT LOUD, WHERE READS DEGRADE QUIETLY. A suggestion box that swallows
 * suggestions is worse than one that admits it is off, so every failure below carries
 * a sentence written for the person who hit it. The search route next door does the
 * opposite and answers an empty list for everything.
 *
 * THE PLAYLIST IS NOT A PARAMETER, AND THAT IS WHAT ACTUALLY STOPS A VISITOR WRITING
 * SOMEWHERE ELSE. The body carries a track and a name; the destination comes from
 * serverConfig. There is no request anybody can construct that names a different
 * playlist, which is a stronger guarantee than any scope, because Spotify's scopes are
 * verbs rather than resources. If a playlist id ever appears in an AddRequest, that is
 * the bug.
 *
 * THE ORDER OF THE LAST FOUR STEPS IS THE DESIGN. The allowance is reserved BEFORE the
 * write and released if the write fails, rather than counted afterwards. Counted
 * afterwards, two requests arriving together both pass the check and both add, and a
 * cap that loses to a double-click is not a cap.
 */

const fail = (args: { failure: SuggestFailure; status: HttpStatus }) =>
  Response.json(
    { added: false, error: SUGGEST_MESSAGE[args.failure] } satisfies AddResponse,
    { status: args.status }
  );

export const POST = async (request: Request) => {
  /*
   * Not configured is a 503 and a server log naming what is missing, never a response
   * that says so: which environment variable is unset is not a visitor's business.
   */
  if (!suggestService.isConfigured()) {
    console.error(`[suggest] not configured, missing: ${suggestService.missingConfig().join(", ")}`);
    return fail({ failure: SuggestFailure.NotConfigured, status: HttpStatus.ServiceUnavailable });
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return fail({ failure: SuggestFailure.Malformed, status: HttpStatus.BadRequest });
  }

  let body: unknown;
  try {
    const raw = await request.text();
    // content-length is a fast reject only: absent on a chunked request and whatever
    // the sender likes otherwise. The cap that holds is measured on what arrived.
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return fail({ failure: SuggestFailure.Malformed, status: HttpStatus.BadRequest });
    }
    body = JSON.parse(raw);
  } catch {
    return fail({ failure: SuggestFailure.Malformed, status: HttpStatus.BadRequest });
  }

  const result = suggestService.validate({ body });
  if (!result.valid) {
    return fail({ failure: result.failure, status: HttpStatus.BadRequest });
  }

  const { track_uri, name } = result.request;

  /*
   * Minted here when absent, so the first add is counted against an id the browser does
   * not have yet and the Set-Cookie rides out with the response. No chicken and egg,
   * and somebody who only reads the playlist is never given a cookie at all.
   */
  const visitor = readVisitor({ request }) ?? mintVisitor();

  /*
   * IN PARALLEL, BECAUSE NEITHER NEEDS THE OTHER. The track read and the duplicate
   * check are two independent Spotify round trips, and running them in sequence would
   * make every add wait for both in turn. The uris read is deliberately uncached: a
   * cached answer a minute old is how the same track gets on twice.
   */
  let track: Awaited<ReturnType<typeof playlistService.getTrack>>;
  let present: Set<string>;
  try {
    [track, present] = await Promise.all([
      playlistService.getTrack({ uri: track_uri }),
      playlistService.trackUris(),
    ]);
  } catch (error) {
    console.error("[suggest] pre-add reads failed:", error);
    return fail({ failure: SuggestFailure.SpotifyFailed, status: HttpStatus.BadGateway });
  }

  // Read from Spotify rather than trusted from the browser: a duration arriving in the
  // request is a number the sender chose, and the rule has to hold against a caller
  // that is not our own page.
  if (!track) return fail({ failure: SuggestFailure.TrackInvalid, status: HttpStatus.BadRequest });

  if (track.duration_ms > MAX_TRACK_MS) {
    return fail({ failure: SuggestFailure.TrackTooLong, status: HttpStatus.BadRequest });
  }

  if (present.has(track_uri)) {
    return fail({ failure: SuggestFailure.Duplicate, status: HttpStatus.Conflict });
  }

  // Reserve before writing. See the note at the top for why this order and not the
  // other one.
  let allowed: boolean;
  try {
    allowed = await suggestService.reserveAdd({ visitor_id: visitor.id, cap: DAILY_ADD_CAP });
  } catch (error) {
    console.error("[suggest] reserve failed:", error);
    return fail({ failure: SuggestFailure.NotConfigured, status: HttpStatus.ServiceUnavailable });
  }

  if (!allowed) return fail({ failure: SuggestFailure.CapReached, status: HttpStatus.TooManyRequests });

  try {
    await playlistService.addTrack({ uri: track_uri });
  } catch (error) {
    // The allowance was spent on something that did not happen, so it goes back. A
    // failure here should cost the visitor nothing.
    await suggestService
      .releaseAdd({ visitor_id: visitor.id })
      .catch((releaseError) => console.error("[suggest] release failed:", releaseError));

    console.error("[suggest] add failed:", error);
    return fail({ failure: SuggestFailure.SpotifyFailed, status: HttpStatus.BadGateway });
  }

  /*
   * The track is on the playlist now, so losing the name is a blemish rather than a
   * failure and is logged instead of surfaced. The row would render without an
   * attribution, which is a far better outcome than an error on an add that worked.
   */
  await suggestService
    .record({ track_uri, name, visitor_id: visitor.id })
    .catch((error) => console.error("[suggest] record failed:", error));

  /*
   * The server's own version of the row, so the page can replace its optimistic one
   * rather than refetching the whole list. added_at is now: Spotify stamps the same
   * moment, and reading it back would cost another request to learn what we already
   * know.
   */
  const entry: QueueEntry = {
    ...track,
    added_at: new Date().toISOString(),
    added_by: name,
  };

  return Response.json({ added: true, entry } satisfies AddResponse, {
    status: HttpStatus.Ok,
    // The name rides along, so a returning visitor adds in one click. Secure is off on
    // plain-http localhost only, where setting it would drop the cookie silently.
    headers: {
      /* SECURE COMES FROM THE DEPLOYMENT, NOT THE REQUEST URL. Behind a proxy that
         terminates TLS, request.url is http on an https site, and the cookie would go
         out without Secure exactly where it matters most. The environment is the thing
         that actually knows. */
      "Set-Cookie": visitorCookie({
        visitor: { id: visitor.id, name },
        secure: serverConfig.env !== Env.Local,
      }),
    },
  });
};
