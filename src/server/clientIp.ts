import "server-only";

/**
 * Best-effort client address, for throttling.
 *
 * Lifted out of the contact route, which had it inline, because the lab's search proxy
 * needs the same thing and a second copy is how the two would end up disagreeing about
 * which header to trust.
 *
 * x-forwarded-for IS CLIENT-SETTABLE, so a determined sender can rotate it and slip any
 * limit keyed on this. That is accepted rather than solved: the honeypot is what stops
 * bots on the contact form, the search cache is what protects the Spotify quota, and
 * this only has to stop a naive loop.
 *
 * Falls back to a shared bucket when the host sets no forwarding header at all, which
 * is every request under `next dev`. Everyone local therefore shares one allowance,
 * which is correct for a development machine and would be wrong in production, where
 * the header is always present.
 */
export const clientIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
};
