import "server-only";
import {
  PLAYLIST_MAX_PAGES,
  PLAYLIST_SUMMARY_TTL_MS,
  QUEUE_READ_LIMIT,
  SEARCH_LIMIT,
} from "@/constants";
import { Spotify } from "@/models";
import type { PlaylistSnapshot, SearchResult } from "@/models";
import { getEpochMilliseconds } from "@/oras/milliseconds";
import { serverConfig } from "@/server/serverConfig";
import { spotifyEndpoints } from "@/server/endpoints";
import { hasCredentials, hasWriteCredentials } from "./spotifyAccessTokens";
import { spotifyRead, spotifyWrite } from "./spotifyApiClient";
import { toPlaylistSummary, toQueueEntry, toSearchResult, trackIdFromUri } from "./mappers";

/**
 * The lab playlist: reading it, searching for something to put on it, and putting it
 * there.
 *
 * Separate from listeningActivity.ts because the two answer to different pages and
 * fail differently. The now-playing panel is decoration on the homepage; this is the
 * subject of /lab/suggest. They are reachable as one namespace from index.ts, which
 * groups them without joining their failure domains.
 *
 * ONE REQUEST SERVES THE WHOLE PAGE, which is the shape everything here is arranged
 * around. Spotify embeds a playlist's first page of items inside the playlist record,
 * so a single projection returns the name, the cover, the count, every track and their
 * durations. The header, the list and the runtime sum used to be three traversals.
 *
 * READS ARE CACHED AND THE WRITE PATH IS NOT, deliberately. The page can be served a
 * snapshot up to a minute old and nobody can tell. The duplicate check cannot: a track
 * added a minute ago would slip past as new, so the add path pays for a fresh
 * uris-only read, which is under a hundred bytes.
 */

/* Reads go through spotifyRead and the add goes through spotifyWrite, both of which
   retry once on a 401 with a freshly minted token. A cached access token can be
   revoked before its clock runs out; see the header of spotifyApiClient.ts for how
   that was found. The private get<T> that used to sit here is that file's getJson. */

/** `next` arrives absolute; everything in this folder speaks paths. */
const toPath = (next: string | null | undefined): string | null =>
  next ? next.replace(serverConfig.spotify_api_url, "") : null;

/**
 * Walks the pages after the first one.
 *
 * The cap is a guard against a paging bug becoming an unbounded loop, not a limit
 * anybody expects to reach: twenty pages is two thousand tracks.
 */
const restOfPages = async <T>(args: {
  first: Spotify.PlaylistItemsResponse | null | undefined;
  collect: (page: Spotify.PlaylistItemsResponse) => T[];
}): Promise<T[]> => {
  const { first, collect } = args;
  const found: T[] = [];

  let path = toPath(first?.next);
  for (let page = 0; page < PLAYLIST_MAX_PAGES && path; page += 1) {
    const body: Spotify.PlaylistItemsResponse | null = await spotifyRead.getJson({ path });
    if (!body) break;
    found.push(...collect(body));
    path = toPath(body.next);
  }

  return found;
};

/**
 * One snapshot in module scope, holding everything the page needs.
 *
 * Per-instance, which is correct here for the same reason it is correct for the search
 * cache and wrong for the daily counter: a cold cache costs a request, and a cold
 * counter would cost the cap.
 *
 * INVALIDATED ON A SUCCESSFUL ADD rather than left to expire. The one moment the
 * playlist is known to have changed is the moment this process changed it, so waiting
 * out a TTL then would be choosing to serve something known to be wrong.
 */
const createSnapshotCache = () => {
  let cached: { value: PlaylistSnapshot; expires_at: number } | null = null;

  return {
    read: (): PlaylistSnapshot | null =>
      cached && cached.expires_at > getEpochMilliseconds.now() ? cached.value : null,
    write: (value: PlaylistSnapshot) => {
      cached = { value, expires_at: getEpochMilliseconds.now() + PLAYLIST_SUMMARY_TTL_MS };
    },
    clear: () => {
      cached = null;
    },
  };
};

const snapshotCache = createSnapshotCache();

/**
 * The playlist as the page renders it: header, rows, and the numbers.
 *
 * Null rather than a throw, and null rather than an "unavailable" shape: the header
 * simply does not render, which is the reads-degrade half of the rule. The one thing
 * this must never do is take down a page that is otherwise able to explain itself.
 */
const snapshot = async (): Promise<PlaylistSnapshot | null> => {
  try {
    if (!hasCredentials() || !serverConfig.spotify_playlist_id) return null;

    const cached = snapshotCache.read();
    if (cached) return cached;

    const id = serverConfig.spotify_playlist_id;

    const playlist = await spotifyRead.getJson<Spotify.PlaylistResponse>({
      path: spotifyEndpoints.playlist({ id, limit: QUEUE_READ_LIMIT }),
    });

    if (!playlist?.name) return null;

    const entries = [
      ...(playlist.items?.items ?? []),
      ...(await restOfPages({
        first: playlist.items,
        collect: (page) => page.items ?? [],
      })),
    ];

    const queue = entries
      .filter((entry) => entry.item?.uri)
      .map((entry) => toQueueEntry({ entry }));

    const value: PlaylistSnapshot = {
      summary: toPlaylistSummary({
        playlist,
        track_count: playlist.items?.total ?? queue.length,
        runtime_ms: queue.reduce((total, row) => total + row.duration_ms, 0),
      }),
      queue,
    };

    snapshotCache.write(value);
    return value;
  } catch (error) {
    console.error("[suggest] playlist snapshot failed:", error);
    return null;
  }
};

/**
 * Every uri on the playlist, read fresh.
 *
 * Uncached on purpose, and the one read in this file that is. It answers the duplicate
 * question at the moment of the add, where a cached answer a minute old is how the same
 * track gets on twice. The projection is uris and nothing else, so it costs almost
 * nothing to be right.
 */
const trackUris = async (): Promise<Set<string>> => {
  const id = serverConfig.spotify_playlist_id;

  const first = await spotifyRead.getJson<Spotify.PlaylistItemsResponse>({
    path: spotifyEndpoints.playlistTrackUris({ id, limit: QUEUE_READ_LIMIT }),
  });

  const uris = (page: Spotify.PlaylistItemsResponse) =>
    (page.items ?? []).map((entry) => entry.item?.uri).filter((uri): uri is string => Boolean(uri));

  return new Set([
    ...uris(first ?? {}),
    ...(await restOfPages({ first, collect: uris })),
  ]);
};

/** One track, read from Spotify rather than trusted from the browser. */
const getTrack = async (args: { uri: string }): Promise<SearchResult | null> => {
  const id = trackIdFromUri(args.uri);
  if (!id) return null;

  const track = await spotifyRead.getJson<Spotify.TrackResponse>({
    path: spotifyEndpoints.track({ id }),
  });

  return track?.name ? toSearchResult({ track, uri: args.uri }) : null;
};

/** Track search, for the proxy route. Throws; the route decides what a failure means. */
const search = async (args: { q: string }): Promise<SearchResult[]> => {
  const found = await spotifyRead.getJson<Spotify.SearchTracksResponse>({
    path: spotifyEndpoints.search({ q: args.q, limit: SEARCH_LIMIT }),
  });

  return (found?.tracks?.items ?? [])
    .filter((track) => track.uri && track.name)
    .map((track) => toSearchResult({ track, uri: track.uri! }));
};

/**
 * Puts a track on the playlist, at the top.
 *
 * POSITION 0, WHICH IS WHAT KEEPS THE PAGE FREE OF PAGINATION. Inserting at the top
 * means the playlist is natively newest-first, so one hundred-item read is always the
 * newest hundred however large it grows.
 *
 * Verified against the live API: this path answers 201 and the `/tracks` equivalent
 * answers 403. See docs/suggest-setup.md.
 *
 * Throws on failure, and the caller is expected to release the visitor's reserved
 * allowance when it does.
 */
const addTrack = async (args: { uri: string }): Promise<void> => {
  const id = serverConfig.spotify_playlist_id;

  await spotifyWrite.post({
    path: spotifyEndpoints.playlistAdd({ id }),
    body: { uris: [args.uri], position: 0 },
  });

  // The playlist has changed and this process is the reason, so the next reader should
  // not be handed the snapshot taken before it.
  snapshotCache.clear();
};

/** Whether an add can even be attempted. Reads and writes are configured separately. */
const canWrite = (): boolean =>
  hasWriteCredentials() && Boolean(serverConfig.spotify_playlist_id);

export const suggestPlaylist = {
  snapshot,
  trackUris,
  getTrack,
  search,
  addTrack,
  canWrite,
};
