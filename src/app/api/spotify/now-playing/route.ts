import { getNowPlayingPayload, OFFLINE_PAYLOAD, readCredentials } from "@/lib/spotify";

// Live data — never prerender this at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  const creds = readCredentials();

  // No credentials configured (fresh clone, forgotten env var on the host).
  // The panel is decoration, not infrastructure: hand back the offline shape
  // with a 200 so the homepage renders cleanly instead of surfacing an error.
  if (!creds) return json(OFFLINE_PAYLOAD);

  try {
    return json(await getNowPlayingPayload(creds));
  } catch (err) {
    console.error("[spotify] now-playing failed:", err);
    return json(OFFLINE_PAYLOAD);
  }
}

function json(payload: unknown) {
  return Response.json(payload, {
    headers: {
      // s-maxage lets a CDN absorb traffic spikes; max-age=0 keeps the browser
      // out of it, since reloading the page is the only way to refresh the
      // panel and a heuristically cached response would defeat that.
      "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
