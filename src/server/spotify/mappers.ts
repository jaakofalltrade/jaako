import "server-only";
import {
  ART_HOST,
  PREFERRED_ART_WIDTH,
  SPOTIFY_LINK_HOST,
  SPOTIFY_WEB_URL,
} from "@/constants";
import { Spotify } from "@/models";
import { mostCommon } from "@/utils/collection";
import { fromHost } from "@/utils/url";

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
const pickArt = (images: Spotify.ImageResponse[] | undefined): string | null => {
  if (!images?.length) return null;

  const byCloseness = [...images].sort(
    (a, b) =>
      Math.abs((a.width ?? 0) - PREFERRED_ART_WIDTH) -
      Math.abs((b.width ?? 0) - PREFERRED_ART_WIDTH)
  );

  return toArtUrl(byCloseness[0]?.url);
};

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
