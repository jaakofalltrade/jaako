import { rateLimit, readConfig, send, validate } from "@/lib/contact";

// POST handlers are never cached, but the route also reads request headers, so
// be explicit: nothing here may be lifted to build time.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = readConfig();

  // No credentials configured (fresh clone, forgotten env var on the host).
  // Unlike the Spotify panel this can't degrade silently — a form that swallows
  // messages is worse than one that admits it's broken.
  if (!config) {
    console.error("[contact] RESEND_API_KEY / CONTACT_FROM_EMAIL / CONTACT_TO_EMAIL not set");
    return json({ ok: false, error: "The form isn't wired up yet. Use the e-mail link instead." }, 503);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Malformed request." }, 400);
  }

  const result = validate(payload);

  if (!result.ok) {
    // Honeypot: answer exactly like a success so the bot logs a 200 and moves
    // on, and drop the message on the floor.
    if (result.error === "__honeypot__") return json({ ok: true }, 200);
    return json({ ok: false, error: result.error }, 400);
  }

  if (!rateLimit(clientIp(request))) {
    return json({ ok: false, error: "Slow down — try again in a few minutes." }, 429);
  }

  try {
    await send(config, result.message);
  } catch (err) {
    console.error("[contact] send failed:", err);
    return json({ ok: false, error: "Couldn't send that. Try the e-mail link instead." }, 502);
  }

  return json({ ok: true }, 200);
}

/**
 * Best-effort client IP for the throttle.
 *
 * x-forwarded-for is a client-settable header, so a determined sender can rotate
 * it and slip the limit. That's accepted: the honeypot is what stops bots, and
 * this only has to stop a naive loop. Falls back to a shared bucket when the
 * host sets no forwarding header at all (e.g. `next dev`).
 */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function json(payload: { ok: boolean; error?: string }, status: number) {
  return Response.json(payload, { status });
}
