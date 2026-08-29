import "server-only";
import { RATE_LIMIT } from "@/constants";

/**
 * Per-IP throttle. Prunes timestamps outside the window on every call, which
 * doubles as the map's garbage collection for that key.
 *
 * Closed over rather than module-level so the store is swappable — see the note
 * on RATE_LIMIT in src/constants/contact.ts.
 */
const createRateLimiter = () => {
  const hits = new Map<string, number[]>();

  return {
    allow: (args: { ip: string }): boolean => {
      const { ip } = args;
      const now = Date.now();
      const recent = (hits.get(ip) ?? []).filter((at) => now - at < RATE_LIMIT.window_ms);

      if (recent.length >= RATE_LIMIT.max) {
        hits.set(ip, recent);
        return false;
      }

      hits.set(ip, [...recent, now]);
      return true;
    },
  };
};

export const rateLimiter = createRateLimiter();
