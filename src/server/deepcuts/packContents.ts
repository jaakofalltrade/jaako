import "server-only";
import { QUEUE_READ_LIMIT, SCORED_TRACK_LIMIT, SCORING_CONCURRENCY } from "@/constants";
import { Spotify } from "@/models";
import type { PackContents, ScoredTrack } from "@/models";
import { lastfmService } from "@/server/lastfm";
import { spotifyEndpoints } from "@/server/endpoints";
import { spotifyRead } from "@/server/spotify/spotifyApiClient";
import { hasCredentials } from "@/server/spotify/spotifyAccessTokens";
import { artistNames } from "@/server/spotify/mappers";
import { rarityOf } from "@/utils/rarity";

/**
 * What is inside one pack: the songs on a playlist, each with a rung.
 *
 * TWO UPSTREAMS IN ONE FUNCTION, WHICH IS THE ONLY PLACE IN THE REPO THAT DOES THAT.
 * Spotify says which songs are on the playlist; last.fm says how many people have
 * played each of them; rarityOf turns the second into a rung. Neither half can answer
 * on its own and they fail differently, which is what the shape below is arranged
 * around.
 *
 * SPOTIFY FAILING IS AN EMPTY PANEL. There is no list without it.
 * LAST.FM FAILING IS AN UNSCORED PANEL. Every song still renders, with no rung and no
 * count, and `scored` says so. That is the degradation docs/lab.md asks for: a page
 * that admits it could not score rather than one that invents five bands.
 *
 * READ ON A CLICK, NOT ON PAGE LOAD, and that is why it is not part of the shelf's own
 * fetch. Scoring one playlist is one Spotify request plus up to fifty last.fm ones;
 * doing that for seventy-five playlists to paint a grid nobody has opened yet would be
 * several thousand outbound requests per page view.
 */

/**
 * The scored contents of one playlist.
 *
 * Null when Spotify could not be read at all, which the route turns into a 502. Reads
 * degrade everywhere else on this page; here there is nothing left to render if the
 * track list is missing, so the caller is told rather than handed an empty pack.
 */
export const packContents = async (args: {
  playlist_id: string;
}): Promise<PackContents | null> => {
  const { playlist_id } = args;

  if (!hasCredentials()) return null;

  try {
    const playlist = await spotifyRead.getJson<Spotify.PlaylistResponse>({
      path: spotifyEndpoints.playlist({ id: playlist_id, limit: QUEUE_READ_LIMIT }),
    });

    if (!playlist?.name) return null;

    /* Only the first page, and only the first SCORED_TRACK_LIMIT of it. The shelf's own
       read walks every page because it needs a total; this one is filling a panel, and
       the panel says how many of how many it is showing. */
    const entries = (playlist.items?.items ?? [])
      .filter((entry) => entry.item?.name)
      .slice(0, SCORED_TRACK_LIMIT);

    const total = playlist.items?.total ?? entries.length;

    const tracks = await scoreAll({
      tracks: entries.map((entry) => ({
        uri: entry.item?.uri ?? "",
        title: entry.item?.name ?? "unknown",
        artist: artistNames(entry.item?.artists),
      })),
    });

    return {
      playlist_id,
      name: playlist.name,
      track_count: total,
      /* Whether the rungs mean anything. False on a deployment with no last.fm key, and
         the panel prints the songs without them rather than pretending. */
      scored: lastfmService.hasKey(),
      tracks,
    };
  } catch (error) {
    console.error("[deepcuts] pack contents failed:", error);
    return null;
  }
};

/**
 * Scores a list of tracks, a few at a time.
 *
 * BOUNDED CONCURRENCY RATHER THAN Promise.all OVER THE LOT. The counts are cached for
 * six hours so this only bites on a cold playlist, but a cold one at fifty tracks would
 * open fifty sockets to last.fm at once and they rate-limit per key. Sequential would be
 * correct and would take fifty round trips; ten at a time is five.
 */
const scoreAll = async (args: {
  tracks: { uri: string; title: string; artist: string }[];
}): Promise<ScoredTrack[]> => {
  const { tracks } = args;
  const scored: ScoredTrack[] = [];

  for (let start = 0; start < tracks.length; start += SCORING_CONCURRENCY) {
    const batch = tracks.slice(start, start + SCORING_CONCURRENCY);

    scored.push(
      ...(await Promise.all(
        batch.map(async (track) => {
          const plays = await lastfmService.playCount({
            artist: track.artist,
            title: track.title,
          });

          return {
            ...track,
            plays,
            /* Null for a track last.fm could not match, and the panel renders that as
               "unmatched" rather than as the rarest rung. See rarityOf: guessing here
               would make every failed match look like the best card in the app. */
            tier: rarityOf({ plays }),
          };
        })
      ))
    );
  }

  return scored;
};
