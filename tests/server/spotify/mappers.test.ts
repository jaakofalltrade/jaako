import { describe, expect, it } from "vitest";
import { Spotify } from "@/models";
import {
  artistNames,
  modalGenre,
  toDeepcutsPlaylist,
  toItemUrl,
  toPlaylistSummary,
  toTrack,
} from "@/server/spotify/mappers";

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

describe("toPlaylistSummary", () => {
  /* Shaped exactly as the real lab playlist answered, including the null dimensions on
     the cover and the count living under `items` rather than `tracks`. */
  const real: Spotify.PlaylistResponse = {
    name: "Portfolio Playlist",
    description: "Song suggestions from my portfolio.",
    external_urls: { spotify: "https://open.spotify.com/playlist/2CK3Ap0UNSCwatm9cIijx2" },
    images: [
      { url: "https://image-cdn-fa.spotifycdn.com/image/ab67706c0000da84", width: null, height: null },
    ],
    owner: { display_name: "jaako" },
    followers: { total: 0 },
    items: { total: 1 },
  };

  it("maps the playlist as Spotify actually returns it", () => {
    expect(toPlaylistSummary({ playlist: real, track_count: 1, runtime_ms: 236_560 })).toEqual({
      name: "Portfolio Playlist",
      description: "Song suggestions from my portfolio.",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67706c0000da84",
      url: "https://open.spotify.com/playlist/2CK3Ap0UNSCwatm9cIijx2",
      track_count: 1,
      runtime_ms: 236_560,
      owner: "jaako",
    });
  });

  /* The count is passed in rather than read off the playlist, because the caller has
     already had to page through the items to sum their durations and knows the real
     figure. items.total is what it derives that from; see suggestPlaylist.snapshot. */
  it("reports the count it was given", () => {
    expect(toPlaylistSummary({ playlist: real, track_count: 42, runtime_ms: 0 }).track_count).toBe(42);
  });

  /* A cover on a rotating spotifycdn subdomain has to survive; anything else must not. */
  it("keeps a cover on either spotifycdn subdomain", () => {
    const ak = { ...real, images: [{ url: "https://image-cdn-ak.spotifycdn.com/image/x" }] };
    expect(toPlaylistSummary({ playlist: ak, track_count: 0, runtime_ms: 0 }).cover).toBe(
      "https://image-cdn-ak.spotifycdn.com/image/x"
    );
  });

  it("keeps a cover on i.scdn.co, which is where a mosaic lands", () => {
    const mosaic = { ...real, images: [{ url: "https://i.scdn.co/image/x", width: 640 }] };
    expect(toPlaylistSummary({ playlist: mosaic, track_count: 0, runtime_ms: 0 }).cover).toBe(
      "https://i.scdn.co/image/x"
    );
  });

  it("refuses a cover from anywhere else, so the card renders its placeholder", () => {
    const bad = { ...real, images: [{ url: "https://example.test/cover.jpg" }] };
    expect(toPlaylistSummary({ playlist: bad, track_count: 0, runtime_ms: 0 }).cover).toBeNull();
  });

  it("has no cover when there are no images", () => {
    expect(toPlaylistSummary({ playlist: { ...real, images: [] }, track_count: 0, runtime_ms: 0 }).cover).toBeNull();
  });

  /* Every field on Spotify's playlist object is optional in its schema, and the header
     must render something for each one rather than letting undefined reach JSX. */
  it("maps an entirely empty playlist without producing undefined", () => {
    expect(toPlaylistSummary({ playlist: {}, track_count: 0, runtime_ms: 0 })).toEqual({
      name: "the playlist",
      description: "",
      cover: null,
      url: "https://open.spotify.com",
      track_count: 0,
      runtime_ms: 0,
      owner: "",
    });
  });

  it("falls back to Spotify's home page for a link on another host", () => {
    const bad = { ...real, external_urls: { spotify: "https://example.test/playlist" } };
    expect(toPlaylistSummary({ playlist: bad, track_count: 0, runtime_ms: 0 }).url).toBe("https://open.spotify.com");
  });
});

describe("toDeepcutsPlaylist", () => {
  const cover = "https://image-cdn-fa.spotifycdn.com/image/abc";

  it("maps a playlist to a pack", () => {
    expect(
      toDeepcutsPlaylist({
        playlist: {
          id: "2CK3Ap0UNSCwatm9cIijx2",
          name: "deep house",
          images: [{ url: cover, width: null, height: null }],
          external_urls: { spotify: "https://open.spotify.com/playlist/2CK3Ap0UNSCwatm9cIijx2" },
          tracks: { total: 41 },
        },
      })
    ).toEqual({
      id: "2CK3Ap0UNSCwatm9cIijx2",
      name: "deep house",
      cover,
      url: "https://open.spotify.com/playlist/2CK3Ap0UNSCwatm9cIijx2",
      track_count: 41,
    });
  });

  /* The id is the one field with no stand-in: it is the key the shelf is drawn with and
     what a pack rip will eventually be dealt from. Null so a single malformed entry
     drops itself instead of taking the whole shelf down. */
  it("is null for a playlist with no id", () => {
    expect(toDeepcutsPlaylist({ playlist: { name: "nameless" } })).toBeNull();
  });

  /* THE COUNT IS `items`, NOT `tracks`, AND THAT IS MEASURED. Both the full playlist
     record and the simplified one Spotify returns in a list answer `items` where every
     version of the documentation says `tracks`. The second name is read as insurance
     against the endpoint ever moving back to the documented one, because the failure it
     would cause is silent: zero on a playlist with forty songs on it. */
  it("reads the count from items.total, which is the name Spotify actually uses", () => {
    expect(
      toDeepcutsPlaylist({ playlist: { id: "a", items: { total: 9 } } })?.track_count
    ).toBe(9);
  });

  it("falls back to the documented tracks.total", () => {
    expect(
      toDeepcutsPlaylist({ playlist: { id: "a", tracks: { total: 7 } } })?.track_count
    ).toBe(7);
  });

  it("prefers items over tracks when both arrive", () => {
    expect(
      toDeepcutsPlaylist({ playlist: { id: "a", items: { total: 9 }, tracks: { total: 7 } } })
        ?.track_count
    ).toBe(9);
  });

  it("is zero when neither name carries a count", () => {
    expect(toDeepcutsPlaylist({ playlist: { id: "a" } })?.track_count).toBe(0);
  });

  /* An empty playlist is a real thing and its count is a real zero. `??` rather than
     `||` is what keeps it from falling through to the other name, or to the default. */
  it("keeps zero as a real answer rather than falling through", () => {
    expect(
      toDeepcutsPlaylist({ playlist: { id: "a", items: { total: 0 }, tracks: { total: 40 } } })
        ?.track_count
    ).toBe(0);
  });

  it("names an untitled playlist rather than rendering undefined", () => {
    expect(toDeepcutsPlaylist({ playlist: { id: "a" } })?.name).toBe("untitled playlist");
  });

  /* A playlist cover comes from a rotating spotifycdn.com subdomain, which is why this
     takes the wider suffix check rather than the exact i.scdn.co one album art gets. */
  it("keeps a cover on the rotating playlist CDN", () => {
    expect(
      toDeepcutsPlaylist({
        playlist: { id: "a", images: [{ url: "https://image-cdn-ak.spotifycdn.com/image/x" }] },
      })?.cover
    ).toBe("https://image-cdn-ak.spotifycdn.com/image/x");
  });

  it("refuses a cover from a host we did not expect", () => {
    expect(
      toDeepcutsPlaylist({
        playlist: { id: "a", images: [{ url: "https://evilspotifycdn.com/image/x" }] },
      })?.cover
    ).toBeNull();
  });

  it("has no cover when the playlist has no images", () => {
    expect(toDeepcutsPlaylist({ playlist: { id: "a" } })?.cover).toBeNull();
  });

  it("falls back to Spotify's home page for a link on another host", () => {
    expect(
      toDeepcutsPlaylist({
        playlist: { id: "a", external_urls: { spotify: "https://example.test/x" } },
      })?.url
    ).toBe("https://open.spotify.com");
  });
});
