import "server-only";
import {
  ART_HOST,
  PLAYLIST_ART_HOSTS,
  PLAYLIST_ART_SUFFIXES,
  PREFERRED_ART_WIDTH,
  SPOTIFY_LINK_HOST,
  SPOTIFY_WEB_URL,
} from "@/constants";
import { Spotify } from "@/models";
import type { PlaylistSummary, QueueEntry, SearchResult } from "@/models";
import { mostCommon } from "@/utils/collection";
import { fromHost, fromHostList } from "@/utils/url";

/**
 * Spotify's response shapes in, our own shapes out.
 *
 * Pure — nothing here fetches, reads config or touches a secret. That is what makes
 * this the file to open when the panel renders the wrong thing but the request
 * plainly worked.
 *
 * The defensiveness is not decorative. Every field Spotify returns is optional in
 * its own schema, so a track with no album, an album with no art, or an artist list
 * that is present but empty are all shapes that arrive in practice, and each one has
 * to come out as something renderable rather than as undefined reaching JSX.
 */

/** Only Spotify's own CDN is allowed to end up in an <img src>. Null so the panel renders no art. */
const toArtUrl = (url: string | undefined): string | null =>
  fromHost({ url, host: ART_HOST, fallback: null });

/**
 * Only a real Spotify web link is allowed to end up in an href.
 *
 * The mirror of toArtUrl, and it exists for the same reason: this string arrives from
 * a third party and is rendered as an anchor the visitor can click. Spotify is not a
 * hostile source, but "the API only ever returns open.spotify.com" is an assumption
 * held one network hop away, and the site already refuses to trust the same API about
 * image hosts. Checking one and not the other was the asymmetry, not this.
 *
 * Anything that is not that host comes back as SPOTIFY_WEB_URL: another domain, an
 * unparseable string, or a `javascript:` and `data:` URL, all of which parse to an
 * empty hostname and so fail the comparison rather than needing a scheme check of
 * their own. The visitor gets a working link instead of a dead or dangerous one.
 */
const toSpotifyUrl = (url: string | undefined): string =>
  fromHost({ url, host: SPOTIFY_LINK_HOST, fallback: SPOTIFY_WEB_URL });

/**
 * Spotify's artist array as one readable line: "A, B, C".
 *
 * Shared by the now-playing track and the top track, which were building it with the
 * same four-step chain in two files. The `|| "unknown"` rather than `?? "unknown"` is
 * load-bearing: an artists array that is present but empty joins to the empty string,
 * which is falsy but not nullish, and a track credited to nobody should read the same
 * as a track with no artists field at all.
 */
export const artistNames = (artists: { name?: string }[] | undefined): string =>
  artists
    ?.map((artist) => artist.name)
    .filter(Boolean)
    .join(", ") || "unknown";

/** The href for one top artist or top track, host-checked like every other link. */
export const toItemUrl = (item: { external_urls?: { spotify?: string } }): string =>
  toSpotifyUrl(item.external_urls?.spotify);

/**
 * Prefers the cover closest to PREFERRED_ART_WIDTH over the 640px original.
 *
 * `width` is nullable in Spotify's schema even though it is a required field, which
 * is why the sort coalesces it. A null width scores as 0 and sorts furthest from the
 * target, so an image of unknown size is the last one picked rather than the first.
 */
const pickArtUrl = (images: Spotify.ImageResponse[] | undefined): string | undefined => {
  if (!images?.length) return undefined;

  const byCloseness = [...images].sort(
    (a, b) =>
      Math.abs((a.width ?? 0) - PREFERRED_ART_WIDTH) -
      Math.abs((b.width ?? 0) - PREFERRED_ART_WIDTH)
  );

  return byCloseness[0]?.url;
};

/**
 * Choosing which image and deciding whether it is allowed used to be one function, and
 * they are two now because the two callers disagree about the second half: album art is
 * only ever i.scdn.co, and a playlist cover is only ever spotifycdn.com. Picking the
 * closest size is the same job for both; the host check is not.
 */
const pickArt = (images: Spotify.ImageResponse[] | undefined): string | null =>
  toArtUrl(pickArtUrl(images));

export const toTrack = (args: {
  track: Spotify.TrackResponse;
  progress_ms?: number;
}): Spotify.Track => {
  const { track, progress_ms = 0 } = args;

  return {
    title: track.name ?? "unknown",
    artist: artistNames(track.artists),
    album: track.album?.name ?? "",
    album_art: pickArt(track.album?.images),
    url: toSpotifyUrl(track.external_urls?.spotify),
    duration_ms: track.duration_ms ?? 0,
    progress_ms,
  };
};

/**
 * The most common genre across a set of artists.
 *
 * Genre is derived rather than fetched: Spotify tags artists, not tracks, so the
 * modal genre across the top artists is the closest thing to "what you have been
 * listening to" that the API will actually give you.
 *
 * LIVING ON BORROWED TIME. `genres` is marked deprecated on the artist object in
 * Spotify's own schema, alongside `followers` and `popularity`, and there is no
 * replacement anywhere in the API — the genre-seed, recommendation and audio-feature
 * endpoints that could have stood in are all deprecated too. When Spotify starts
 * answering with an empty array this returns null, getTopItems reports a null genre,
 * and ListeningStats drops the row rather than rendering a blank one. The cell
 * disappears; nothing breaks. That is the intended end, not an oversight.
 */
export const modalGenre = (artists: Spotify.TopArtistResponse[]): string | null =>
  mostCommon(artists.flatMap((artist) => artist.genres ?? []));

/**
 * The playlist's own record, for the header on /lab/suggest.
 *
 * `runtime_ms` is passed in rather than read off the playlist, because Spotify does
 * not report a duration anywhere: the only way to a total is to sum every track, which
 * is a different call and possibly several. Keeping the sum outside this function is
 * what keeps this one pure.
 *
 * THE COUNT COMES FROM `items.total`, NOT `tracks.total`. See the note in
 * models/Spotify.ts — asking for the wrong one returns a 200 with the field missing.
 *
 * The cover takes a wider host check than album art does, because a playlist's
 * uploaded cover is served from a rotating spotifycdn.com subdomain rather than from
 * i.scdn.co. Everything else is refused and comes out null, so the header renders its
 * placeholder instead of an image from a host we did not expect.
 */
export const toPlaylistSummary = (args: {
  playlist: Spotify.PlaylistResponse;
  track_count: number;
  runtime_ms: number;
}): PlaylistSummary => {
  const { playlist, track_count, runtime_ms } = args;

  return {
    name: playlist.name ?? "the playlist",
    description: playlist.description ?? "",
    cover: fromHostList({
      url: pickArtUrl(playlist.images),
      hosts: PLAYLIST_ART_HOSTS,
      suffixes: PLAYLIST_ART_SUFFIXES,
      fallback: null,
    }),
    url: toSpotifyUrl(playlist.external_urls?.spotify),
    track_count,
    runtime_ms,
    owner: playlist.owner?.display_name ?? "",
  };
};

/**
 * The id inside a track uri, or null.
 *
 * Strict rather than a split on colons, because this reaches a URL path: the shape is
 * exactly `spotify:track:` and twenty-two base-62 characters, and anything else is a
 * caller sending something we did not give them.
 */
const TRACK_URI = /^spotify:track:([A-Za-z0-9]{22})$/;

export const trackIdFromUri = (uri: string): string | null =>
  TRACK_URI.exec(uri)?.[1] ?? null;

/**
 * A search result, or one track fetched by id.
 *
 * The uri is passed in rather than read off the track, because the two callers know it
 * from different places: search has it on the payload, and the add route has it from
 * the request it is validating.
 */
export const toSearchResult = (args: {
  track: Spotify.TrackResponse;
  uri: string;
}): SearchResult => {
  const { track, uri } = args;

  return {
    uri,
    title: track.name ?? "unknown",
    artist: artistNames(track.artists),
    album: track.album?.name ?? "",
    album_art: pickArt(track.album?.images),
    url: toSpotifyUrl(track.external_urls?.spotify),
    duration_ms: track.duration_ms ?? 0,
  };
};

/**
 * One row of the playlist.
 *
 * `added_by` is left null here and filled in by the join against our own rows. This
 * mapper only knows what Spotify said, which is deliberate: everything in this file is
 * Spotify's shapes in and ours out, and the name is not Spotify's to give. It would
 * report every track as added by the account that owns the token.
 */
export const toQueueEntry = (args: { entry: Spotify.PlaylistItemResponse }): QueueEntry => {
  const { entry } = args;
  const track = entry.item ?? {};

  return {
    ...toSearchResult({ track, uri: track.uri ?? "" }),
    added_at: entry.added_at ?? "",
    added_by: null,
  };
};
