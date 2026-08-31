import { NOW_PLAYING_CACHE_HEADERS } from "@/constants";
import { spotifyService } from "@/server/spotify";

// Live data — never prerender this at build time.
export const dynamic = "force-dynamic";

// getNowPlaying never throws: missing credentials and unreachable-Spotify both
// come back as the offline shape with a 200, so the homepage renders cleanly
// instead of surfacing an error for a decorative panel.
export const GET = async () =>
  Response.json(await spotifyService.listening.getNowPlaying(), {
    headers: NOW_PLAYING_CACHE_HEADERS,
  });
