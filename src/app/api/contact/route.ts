import { MAX_BODY_BYTES, VALIDATION_MESSAGE } from "@/constants/contact";
import { ContactResponse, HttpStatus, ValidationFailure } from "@/models";
import { contactService } from "@/services/contactService";

// POST handlers are never cached, but this also reads request headers, so be
// explicit: nothing here may be lifted to build time.
export const dynamic = "force-dynamic";

const json = (args: { body: ContactResponse; status: HttpStatus }) =>
  Response.json(args.body, { status: args.status });

/**
 * Best-effort client IP for the throttle.
 *
 * x-forwarded-for is a client-settable header, so a determined sender can rotate
 * it and slip the limit. That's accepted: the honeypot is what stops bots, and
 * this only has to stop a naive loop. Falls back to a shared bucket when the host
 * sets no forwarding header at all (e.g. `next dev`).
 */
const clientIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
};

export const POST = async (request: Request) => {
  // No credentials configured (fresh clone, forgotten env var on the host).
  // Unlike the Spotify panel this can't degrade silently — a form that swallows
  // messages is worse than one that admits it's broken.
  if (!contactService.isConfigured()) {
    console.error(
      "[contact] not configured: RESEND_API_KEY missing from the environment, or " +
        "CONTACT_FROM_EMAIL / CONTACT_TO_EMAIL still blank in src/constants/contact.ts",
    );
    return json({
      body: { ok: false, error: "The form isn't wired up yet. Use the e-mail link instead." },
      status: HttpStatus.ServiceUnavailable,
    });
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({
      body: { ok: false, error: VALIDATION_MESSAGE[ValidationFailure.Malformed] },
      status: HttpStatus.BadRequest,
    });
  }

  const tooLong = () =>
    json({
      body: { ok: false, error: VALIDATION_MESSAGE[ValidationFailure.MessageTooLong] },
      status: HttpStatus.BadRequest,
    });

  // content-length is a fast reject only — it's absent on a chunked request and
  // can be any garbage the sender likes, and both cases compare false here. The
  // cap that actually holds is measured on the body we received.
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return tooLong();

  let body: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return tooLong();
    body = JSON.parse(raw);
  } catch {
    return json({
      body: { ok: false, error: VALIDATION_MESSAGE[ValidationFailure.Malformed] },
      status: HttpStatus.BadRequest,
    });
  }

  const result = contactService.validate({ body });

  if (!result.ok) {
    // Honeypot: answer exactly like a success so the bot logs a 200 and moves on,
    // and drop the message on the floor.
    if (result.failure === ValidationFailure.Honeypot) {
      return json({ body: { ok: true }, status: HttpStatus.Ok });
    }
    return json({
      body: { ok: false, error: VALIDATION_MESSAGE[result.failure] },
      status: HttpStatus.BadRequest,
    });
  }

  // Throttled after validation, so a sender fixing a typo doesn't burn their
  // quota on attempts that were never going to send.
  if (!contactService.allow({ ip: clientIp(request) })) {
    return json({
      body: { ok: false, error: "Slow down — try again in a few minutes." },
      status: HttpStatus.TooManyRequests,
    });
  }

  try {
    await contactService.send({ request: result.request });
  } catch (error) {
    console.error("[contact] send failed:", error);
    return json({
      body: { ok: false, error: "Couldn't send that. Try the e-mail link instead." },
      status: HttpStatus.BadGateway,
    });
  }

  return json({ body: { ok: true }, status: HttpStatus.Ok });
};
