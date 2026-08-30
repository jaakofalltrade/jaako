import { describe, expect, it } from "vitest";
import { Spotify } from "@/models";
import { artistNames, modalGenre, toItemUrl, toTrack } from "./mappers";

/**
 * The Spotify mappers.
 *
 * The most valuable pure code in the repo to pin, because every field in Spotify's
 * schema is optional and the defensiveness here is what stops undefined reaching JSX.
 * A track with no album, an album with no art and an artist list that is present but
 * empty all arrive in practice, and each has to come out renderable.
 *
 * `server-only` is aliased away for the test run; see vitest.config.ts.
 */

describe("artistNames", () => {
  it("joins several artists with a comma", () => {
    expect(artistNames([{ name: "a" }, { name: "b" }])).toBe("a, b");
  });

  it("is the single name when there is one", () => {
    expect(artistNames([{ name: "radiohead" }])).toBe("radiohead");
  });

  it("is unknown when the field is missing", () => {
    expect(artistNames(undefined)).toBe("unknown");
  });

  /* The `||` rather than `??` is load-bearing: an array that is present but empty
     joins to the empty string, which is falsy but not nullish, and a track credited to
     nobody should read the same as a track with no artists field at all. */
  it("is unknown for an array that is present but empty", () => {
    expect(artistNames([])).toBe("unknown");
  });

  it("is unknown when every entry is nameless", () => {
    expect(artistNames([{}, { name: undefined }])).toBe("unknown");
  });

  it("skips the nameless ones and keeps the rest", () => {
    expect(artistNames([{ name: "a" }, {}, { name: "b" }])).toBe("a, b");
  });
});

describe("toItemUrl", () => {
  it("keeps a real Spotify link", () => {
    const url = "https://open.spotify.com/artist/abc";
    expect(toItemUrl({ external_urls: { spotify: url } })).toBe(url);
  });

  /* Spotify is not a hostile source, but "the API only ever returns open.spotify.com"
     is an assumption held one network hop away, and this string is rendered as an
     anchor a visitor can click. */
  it("falls back to Spotify's home page for another host", () => {
    expect(toItemUrl({ external_urls: { spotify: "https://example.test/x" } })).toBe(
      "https://open.spotify.com"
    );
  });

  it("falls back when there is no external url at all", () => {
    expect(toItemUrl({})).toBe("https://open.spotify.com");
  });
});

describe("toTrack", () => {
  const full: Spotify.TrackResponse = {
    name: "karma police",
    duration_ms: 261_000,
    artists: [{ name: "radiohead" }],
    album: {
      name: "ok computer",
      images: [
        { url: "https://i.scdn.co/image/640", width: 640 },
        { url: "https://i.scdn.co/image/300", width: 300 },
        { url: "https://i.scdn.co/image/64", width: 64 },
      ],
    },
    external_urls: { spotify: "https://open.spotify.com/track/abc" },
  };

  it("maps a complete track", () => {
    expect(toTrack({ track: full })).toEqual({
      title: "karma police",
      artist: "radiohead",
      album: "ok computer",
      album_art: "https://i.scdn.co/image/300",
      url: "https://open.spotify.com/track/abc",
      duration_ms: 261_000,
      progress_ms: 0,
    });
  });

  /* The panel renders the cover at 76px, so the ~300px image is the right pick and the
     640px original is wasted bytes. */
  it("prefers the art closest to the preferred width", () => {
    expect(toTrack({ track: full }).album_art).toBe("https://i.scdn.co/image/300");
  });

  /* `width` is nullable in Spotify's schema even though it is a required field, so an
     image of unknown size scores as 0 and sorts furthest from the target. It should be
     the last one picked, not the first. */
  it("picks a sized image over one with no width", () => {
    const track: Spotify.TrackResponse = {
      ...full,
      album: { name: "x", images: [{ url: "https://i.scdn.co/image/none" }, { url: "https://i.scdn.co/image/300", width: 300 }] },
    };
    expect(toTrack({ track }).album_art).toBe("https://i.scdn.co/image/300");
  });

  it("carries progress through when it is given", () => {
    expect(toTrack({ track: full, progress_ms: 42_000 }).progress_ms).toBe(42_000);
  });

  /* Only Spotify's own CDN may end up in an img src. Null so the panel renders no art
     rather than an image from somewhere else. */
  it("refuses art from another host", () => {
    const track: Spotify.TrackResponse = {
      ...full,
      album: { name: "x", images: [{ url: "https://example.test/cover.jpg", width: 300 }] },
    };
    expect(toTrack({ track }).album_art).toBeNull();
  });

  it("has no art when the album has no images", () => {
    expect(toTrack({ track: { ...full, album: { name: "x", images: [] } } }).album_art).toBeNull();
  });

  /* The shape that arrives most often in practice, and the one where an undefined
     reaching JSX would be visible. Every field has to come out renderable. */
  it("maps an entirely empty track without producing undefined", () => {
    expect(toTrack({ track: {} })).toEqual({
      title: "unknown",
      artist: "unknown",
      album: "",
      album_art: null,
      url: "https://open.spotify.com",
      duration_ms: 0,
      progress_ms: 0,
    });
  });
});

describe("modalGenre", () => {
  it("is the most common genre across the artists", () => {
    expect(
      modalGenre([{ genres: ["indie", "rock"] }, { genres: ["indie"] }, { genres: ["jazz"] }])
    ).toBe("indie");
  });

  it("is null when no artist carries a genre", () => {
    expect(modalGenre([{ genres: [] }, {}])).toBeNull();
  });

  it("is null for no artists at all", () => {
    expect(modalGenre([])).toBeNull();
  });

  /* `genres` is deprecated on Spotify's artist object with no replacement anywhere in
     the API. When it starts coming back empty this returns null, getTopItems reports a
     null genre, and the strip drops the row rather than rendering a blank one. That is
     the intended end, not an oversight, so it is pinned. */
  it("is null when the field is absent, which is how this ends", () => {
    expect(modalGenre([{ name: "a" }, { name: "b" }])).toBeNull();
  });
});
