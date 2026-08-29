import { endpoints } from "@/client/endpoints";
import { OFFLINE_RESPONSE, TOP_ITEMS_OFFLINE } from "@/constants";
import { Spotify } from "@/models";
import { getJson } from "@/utils/getJson";

/**
 * The browser's calls to our own Spotify routes.
 *
 * The only module that knows these routes exist. Components ask for data and get a
 * response shape back — they never see a URL, a fetch, or a parse.
 *
 * Both calls were separate modules for a while, on the grounds that one may sit in
 * the browser cache and the other may not. That difference is one fetch option on one
 * line, which is not enough to be a second file: what it actually bought was two
 * imports, two identical error-handling blocks, and a component that had to know
 * which of two objects held the call it wanted.
 *
 * Neither call throws. A failure here means the widget renders its offline state,
 * which is a real state with real copy — see PEEK_STATUS in constants/spotify.ts.
 */

const nowPlaying = async (args: {
  signal?: AbortSignal;
}): Promise<Spotify.NowPlayingResponse> => {
  const { signal } = args;

  // cache:"no-store" because the refresh button is the only intended way to update
  // the panel, and a heuristically cached response would defeat it.
  return getJson({
    url: endpoints.spotify.now_playing,
    fallback: OFFLINE_RESPONSE,
    init: { signal, cache: "no-store" },
  });
};

const topItems = async (args: { signal?: AbortSignal }): Promise<Spotify.TopItemsResponse> => {
  const { signal } = args;

  // No cache:"no-store" here, unlike now-playing — six-hour-old statistics are
  // still correct, and re-fetching them on every mount would be waste.
  return getJson({
    url: endpoints.spotify.top_items,
    fallback: TOP_ITEMS_OFFLINE,
    init: { signal },
  });
};

export const spotifyApi = {
  nowPlaying,
  topItems,
};
