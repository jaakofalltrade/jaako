import { OFFLINE_RESPONSE } from "@/constants/spotify";
import { Spotify } from "@/models";

/**
 * The browser's calls to our own Spotify routes.
 *
 * The only module that knows the route path exists. Components ask for data and
 * get a response shape back — they never see a URL, a fetch, or a parse.
 */

const NOW_PLAYING_URL = "/api/spotify/now-playing";

const nowPlaying = async (args: {
  signal?: AbortSignal;
}): Promise<Spotify.NowPlayingResponse> => {
  const { signal } = args;

  try {
    const response = await fetch(NOW_PLAYING_URL, { signal, cache: "no-store" });
    if (!response.ok) return OFFLINE_RESPONSE;
    return (await response.json()) as Spotify.NowPlayingResponse;
  } catch {
    // Network failure, or the caller aborted. Either way the panel has something
    // to render — callers check signal.aborted before using this.
    return OFFLINE_RESPONSE;
  }
};

export const spotifyApi = {
  nowPlaying,
};
