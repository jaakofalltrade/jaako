import { TOP_ITEMS_OFFLINE } from "@/constants/spotify";
import { Spotify } from "@/models";

/**
 * The browser's call to our own top-items route.
 *
 * Separate module from spotifyApi for the same reason the routes are separate: this
 * one is allowed to sit in the browser cache, and now-playing is not.
 */

const TOP_ITEMS_URL = "/api/spotify/top-items";

const topItems = async (args: { signal?: AbortSignal }): Promise<Spotify.TopItemsResponse> => {
  const { signal } = args;

  try {
    // No cache:"no-store" here, unlike now-playing — six-hour-old statistics are
    // still correct, and re-fetching them on every mount would be waste.
    const response = await fetch(TOP_ITEMS_URL, { signal });
    if (!response.ok) return TOP_ITEMS_OFFLINE;
    return (await response.json()) as Spotify.TopItemsResponse;
  } catch {
    return TOP_ITEMS_OFFLINE;
  }
};

export const spotifyTopApi = {
  topItems,
};
