import { describe, expect, it } from "vitest";
import { isOwnPublicPlaylist } from "@/server/spotify/deepcutsLibrary";

/**
 * The filter that decides what reaches /lab/deepcuts.
 *
 * The one piece of that module worth pinning, and the reason is what it costs to get
 * wrong: everything else in there is a cache and a paging loop, whose failure is a slow
 * page or a stale count. This decides whether a private playlist's name is printed on a
 * page anybody can open.
 *
 * GET /me/playlists has no filter parameters, so none of this can be pushed upstream.
 * The whole library arrives and these four lines are the only thing between it and the
 * page.
 *
 * `server-only` is aliased away for the test run; see vitest.config.ts.
 */

const OWNER = "happyfrappyloco";
/** Any id that is not one of the site's own. */
const MUSIC = "4DXwAIwLlrtTIXUgNudTgU";

describe("isOwnPublicPlaylist", () => {
  it("keeps a public playlist owned by the account", () => {
    expect(
      isOwnPublicPlaylist({
        playlist: { id: MUSIC, owner: { id: OWNER }, public: true },
        owner: OWNER,
      })
    ).toBe(true);
  });

  it("drops a private playlist, however clearly it is owned", () => {
    expect(
      isOwnPublicPlaylist({
        playlist: { id: MUSIC, owner: { id: OWNER }, public: false },
        owner: OWNER,
      })
    ).toBe(false);
  });

  /* THE CASE THE STRICT COMPARISON EXISTS FOR. Spotify sends null when it will not say
     whether a playlist is public, and null is not consent. `playlist.public` in place
     of `playlist.public === true` passes every other test in this file and fails only
     this one, which is exactly why it is here. */
  it("drops a playlist whose visibility Spotify would not answer", () => {
    expect(
      isOwnPublicPlaylist({
        playlist: { id: MUSIC, owner: { id: OWNER }, public: null },
        owner: OWNER,
      })
    ).toBe(false);
  });

  it("drops a playlist with no public field at all", () => {
    expect(
      isOwnPublicPlaylist({ playlist: { id: MUSIC, owner: { id: OWNER } }, owner: OWNER })
    ).toBe(false);
  });

  /* A library holds followed playlists beside owned ones, and a public playlist owned
     by somebody else is the commonest thing in it. Being dealt cards out of a stranger's
     list is a different app. */
  it("drops a public playlist owned by somebody else", () => {
    expect(
      isOwnPublicPlaylist({
        playlist: { id: MUSIC, owner: { id: "someone-else" }, public: true },
        owner: OWNER,
      })
    ).toBe(false);
  });

  it("drops a playlist with no owner", () => {
    expect(isOwnPublicPlaylist({ playlist: { id: MUSIC, public: true }, owner: OWNER })).toBe(false);
  });

  /* THE SUGGESTION BOX IS PUBLIC AND OWNED BY THIS ACCOUNT, so nothing else in this
     function can tell it from music. A pack dealt out of a list other visitors filled is
     a different app, and by id rather than by name because a rename in the Spotify
     client would quietly put it back on the shelf. */
  it("drops the playlists the suggestion box writes to", () => {
    for (const id of ["4eJiWoi2LBHIxFq2JqDvlo", "2CK3Ap0UNSCwatm9cIijx2"]) {
      expect(
        isOwnPublicPlaylist({
          playlist: { id, owner: { id: OWNER }, public: true },
          owner: OWNER,
        }),
        id
      ).toBe(false);
    }
  });

  /* A playlist with no id cannot be checked against that list, and the mapper drops it
     anyway: the id is the one field a row cannot be drawn without. */
  it("drops a playlist with no id", () => {
    expect(
      isOwnPublicPlaylist({ playlist: { owner: { id: OWNER }, public: true }, owner: OWNER })
    ).toBe(false);
  });

  /* Compared on the id rather than the display name, which two accounts can share. A
     match on the wrong field would put an impostor's playlist on the page. */
  it("ignores the display name entirely", () => {
    expect(
      isOwnPublicPlaylist({
        playlist: { id: MUSIC, owner: { id: "someone-else", display_name: "jaako" }, public: true },
        owner: OWNER,
      })
    ).toBe(false);
  });
});
