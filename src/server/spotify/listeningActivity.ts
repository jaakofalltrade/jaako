import "server-only";
import {
  OFFLINE_RESPONSE,
  RECENT_LIMIT,
  RECENT_SHOWN,
  TOP_ARTIST_LIMIT,
  TOP_ITEMS_OFFLINE,
  TOP_TIME_RANGE,
  TOP_TRACK_LIMIT,
} from "@/constants";
import { Spotify } from "@/models";
import { hasCredentials } from "./spotifyAccessTokens";
import { spotifyRead } from "./spotifyApiClient";
import { spotifyEndpoints } from "@/server/endpoints";
import { artistNames, modalGenre, toItemUrl, toTrack } from "./mappers";

/**
 * The listening reads: what is playing now, and what has been played most lately.
 *
 * What is left here after spotifyAccessTokens.ts, spotifyApiClient.ts, mappers.ts and
 * endpoints.ts took their share is the part that is actually about this site: which
 * calls go out together, what each playback state means, and what to render when
 * Spotify says nothing useful.
 *
 * Neither read throws. The panel is decoration, not infrastructure — anything going
 * wrong degrades to an offline shape so the homepage still renders. That is also why
 * both flows re-check credentials and re-fetch a token rather than sharing a
 * prepared session: they fail independently, and one of them needs a scope the other
 * does not.
 */

/* The private get<T> that used to sit here is now spotifyRead.getJson, shared with
   suggestPlaylist.ts. The 204 case this one knew about and that one did not - it is
   what /me/player/currently-playing sends when nothing is playing - went with it. */

/**
 * Builds the panel response.
 *
 * A paused track is reported as Recent rather than a fourth state: the art should
 * only spin while sound is actually coming out, and the paused track is still the
 * most accurate answer to "what did you last listen to".
 */
const getNowPlaying = async (): Promise<Spotify.NowPlayingResponse> => {
  try {
    // Inside the try, not before it: the route handler has no catch of its own,
    // so anything that escapes here is a 500 rather than the offline panel.
    if (!hasCredentials()) return OFFLINE_RESPONSE;

    const [current, history] = await Promise.all([
      spotifyRead.getJson<Spotify.CurrentlyPlayingResponse>({
        path: spotifyEndpoints.currentlyPlaying(),
      }),
      spotifyRead.getJson<Spotify.RecentlyPlayedResponse>({
        path: spotifyEndpoints.recentlyPlayed({ limit: RECENT_LIMIT }),
      }),
    ]);

    const recent = (history?.items ?? [])
      .map((item) => item.track)
      .filter((track): track is Spotify.TrackResponse => Boolean(track?.name))
      .map((track) => toTrack({ track }));

    const currentTrack = current?.item;

    if (currentTrack?.name) {
      // recently-played never contains the track that is currently playing, so
      // the first entries can be used as-is.
      return {
        status: current?.is_playing
          ? Spotify.PlaybackStatus.Playing
          : Spotify.PlaybackStatus.Recent,
        track: toTrack({
          track: currentTrack,
          progress_ms: current?.progress_ms ?? 0,
        }),
        recent: recent.slice(0, RECENT_SHOWN),
      };
    }

    // Nothing loaded in the player at all — promote the most recent play to the
    // hero slot and drop it from the list so it doesn't appear twice.
    //
    // This is also where a podcast lands. Spotify returns a null item for an
    // episode unless the request opts into them, and this panel does not, so the
    // last music played stands in rather than the show that is actually on.
    if (recent.length) {
      return {
        status: Spotify.PlaybackStatus.Recent,
        track: recent[0],
        // Offset by one because the hero track was taken from the front.
        recent: recent.slice(1, RECENT_SHOWN + 1),
      };
    }

    return OFFLINE_RESPONSE;
  } catch (error) {
    console.error("[spotify] now-playing failed:", error);
    return OFFLINE_RESPONSE;
  }
};

/**
 * Listening statistics for the instrument strip.
 *
 * Needs the user-top-read scope, which the now-playing pair does not — so on a
 * deployment whose refresh token predates that scope, Spotify answers 403 and this
 * returns the unavailable shape rather than throwing. That is the expected state
 * until the token is rotated, not an error worth alarming about.
 *
 * Two calls rather than one because Spotify puts artists and tracks behind the same
 * path with a different type segment; there is no combined form.
 */
const getTopItems = async (): Promise<Spotify.TopItemsResponse> => {
  try {
    if (!hasCredentials()) return TOP_ITEMS_OFFLINE;

    const [artists, tracks] = await Promise.all([
      spotifyRead.getJson<Spotify.TopArtistsResponse>({
        path: spotifyEndpoints.topItems({
          type: "artists",
          time_range: TOP_TIME_RANGE,
          limit: TOP_ARTIST_LIMIT,
        }),
      }),
      spotifyRead.getJson<Spotify.TopTracksResponse>({
        path: spotifyEndpoints.topItems({
          type: "tracks",
          time_range: TOP_TIME_RANGE,
          limit: TOP_TRACK_LIMIT,
        }),
      }),
    ]);

    const topArtist = artists?.items?.find((artist) => artist.name);
    const topTrack = tracks?.items?.find((track) => track.name);

    // Nothing to show is still a successful call — a new account with no history
    // gets the unavailable shape rather than a row of empty labels.
    if (!topArtist && !topTrack) return TOP_ITEMS_OFFLINE;

    return {
      available: true,
      artist: topArtist
        ? {
            name: topArtist.name ?? "unknown",
            url: toItemUrl(topArtist),
          }
        : null,
      track: topTrack
        ? {
            title: topTrack.name ?? "unknown",
            artist: artistNames(topTrack.artists),
            url: toItemUrl(topTrack),
          }
        : null,
      genre: modalGenre(artists?.items ?? []),
    };
  } catch (error) {
    console.error("[spotify] top-items failed:", error);
    return TOP_ITEMS_OFFLINE;
  }
};

export const listeningActivity = {
  getNowPlaying,
  getTopItems,
};
