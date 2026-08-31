import { NextResponse } from "next/server";
import { TOP_ITEMS_CACHE_HEADERS } from "@/constants";
import { spotifyService } from "@/server/spotify";

/**
 * Listening statistics for the instrument strip.
 *
 * Separate from now-playing because the cadence is completely different: now-playing
 * changes every few minutes and is cached for 30 seconds, this changes over weeks and
 * is cached for six hours. Sharing a route would mean caching both at the faster rate.
 */
export const dynamic = "force-dynamic";

export const GET = async () => {
  const payload = await spotifyService.listening.getTopItems();
  return NextResponse.json(payload, { headers: TOP_ITEMS_CACHE_HEADERS });
};
