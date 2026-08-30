import "server-only";
import { PLAYLIST_MAX_PAGES, PLAYLIST_SUMMARY_TTL_MS, QUEUE_READ_LIMIT } from "@/constants";
import { Spotify } from "@/models";
import type { PlaylistSummary } from "@/models";
import { serverConfig } from "@/server/serverConfig";
import { spotifyEndpoints } from "@/server/endpoints";
import { getAccessToken, hasCredentials } from "./auth";
import { toPlaylistSummary } from "./mappers";

/**
 * The lab playlist, read.
 *
 * Separate from spotifyService because the two answer to different pages and fail
 * differently: the now-playing panel is decoration on the homepage, and this is the
 * subject of /lab/suggest. Both degrade rather than throw, but only one of them has a
 * page that is about it.
 *
 * READS ONLY. Adding a track goes through the write credential (getWriteAccessToken)
 * and belongs in the route that does it, not here.
 */

const get = async <T>(args: { path: string; token: string }): Promise<T | null> => {
  const { path, token } = args;

  const response = await fetch(`${serverConfig.spotify_api_url}${args.path}`, {
    headers: { Authorization: `Bearer ${token}` },
    // The summary has its own cache below, with a TTL this file controls. Letting
    // fetch keep a second one underneath it would make staleness two numbers.
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
};

/**
 * The total runtime, summed across every page.
 *
 * SPOTIFY DOES NOT REPORT A PLAYLIST'S DURATION ANYWHERE. It reports a count, and the
 * only route to a total is to add up the tracks, which means walking the pages. The
 * projection asks for durations and nothing else, so a hundred items come back as a
 * hundred integers rather than a hundred track objects.
 *
 * `next` arrives as an absolute URL and everything in this folder speaks in paths
 * relative to spotify_api_url, so it is trimmed back before being followed.
 *
 * The page cap is a guard against a paging bug becoming an unbounded loop, not a limit
 * anybody expects to reach: twenty pages is two thousand tracks.
 */
const totalRuntimeMs = async (args: { token: string; id: string }): Promise<number> => {
  const { token, id } = args;

  let path: string | null = spotifyEndpoints.playlistDurations({
    id,
    limit: QUEUE_READ_LIMIT,
  });
  let total = 0;

  for (let page = 0; page < PLAYLIST_MAX_PAGES && path; page += 1) {
    const body: Spotify.PlaylistItemsResponse | null = await get({ path, token });
    if (!body) break;

    for (const entry of body.items ?? []) {
      total += entry.item?.duration_ms ?? 0;
    }

    path = body.next ? body.next.replace(serverConfig.spotify_api_url, "") : null;
  }

  return total;
};

/**
 * One summary held in module scope, the same shape as the token cache in auth.ts.
 *
 * Rebuilding it costs one request for the record plus one per page of durations, and
 * the answer changes only when somebody adds a track. Five minutes of staleness on a
 * track count is invisible; paying for that sum on every page load would not be.
 *
 * Per-instance, which is correct here for the reason it is correct for the search
 * cache and wrong for the daily counter: a cold cache costs a request, and a cold
 * counter would cost the cap.
 */
const createSummaryCache = () => {
  let cached: { value: PlaylistSummary; expires_at: number } | null = null;

  return {
    read: (): PlaylistSummary | null =>
      cached && cached.expires_at > Date.now() ? cached.value : null,
    write: (value: PlaylistSummary) => {
      cached = { value, expires_at: Date.now() + PLAYLIST_SUMMARY_TTL_MS };
    },
  };
};

const summaryCache = createSummaryCache();

/**
 * The playlist's name, cover, count and runtime, or null.
 *
 * Null rather than a throw, and null rather than an "unavailable" shape: the page's
 * header simply does not render, which is the read-degrades half of the rule. The one
 * thing this must never do is take down a page that is otherwise perfectly able to
 * explain itself.
 */
const summary = async (): Promise<PlaylistSummary | null> => {
  try {
    if (!hasCredentials() || !serverConfig.spotify_playlist_id) return null;

    const cached = summaryCache.read();
    if (cached) return cached;

    const id = serverConfig.spotify_playlist_id;
    const token = await getAccessToken();

    const playlist = await get<Spotify.PlaylistResponse>({
      path: spotifyEndpoints.playlist({ id }),
      token,
    });

    if (!playlist?.name) return null;

    const value = toPlaylistSummary({
      playlist,
      runtime_ms: await totalRuntimeMs({ token, id }),
    });

    summaryCache.write(value);
    return value;
  } catch (error) {
    console.error("[suggest] playlist summary failed:", error);
    return null;
  }
};

export const playlistService = {
  summary,
};
