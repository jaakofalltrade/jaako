import { describe, expect, it } from "vitest";
// @ts-expect-error - a plain .mjs script with no types, aliased in vitest.config.mts.
import { playlistId } from "@scripts/playlist-id.mjs";

/**
 * The playlist link parser behind `pnpm playlist:id`.
 *
 * Worth a test even though it is a script, because the two things it exists to strip
 * both fail SILENTLY when they get through: an id carrying a share token, or a locale
 * segment read as the id, is a well-formed string that points at nothing. There is no
 * error to notice, just a playlist that never loads.
 *
 * The id used here is the real lab playlist, so a case that stops matching is a change
 * in behaviour rather than a change in fixture.
 */

const ID = "2CK3Ap0UNSCwatm9cIijx2";

describe("playlistId", () => {
  it("takes the id out of a plain share URL", () => {
    expect(playlistId(`https://open.spotify.com/playlist/${ID}`)).toBe(ID);
  });

  it("drops the ?si= share token, which differs on every copy of the same link", () => {
    expect(playlistId(`https://open.spotify.com/playlist/${ID}?si=59de2a4eccd546ad`)).toBe(ID);
  });

  it("survives a locale segment, which shifts the id one place along the path", () => {
    expect(playlistId(`https://open.spotify.com/intl-de/playlist/${ID}?si=x`)).toBe(ID);
  });

  it("accepts the desktop client's spotify: uri", () => {
    expect(playlistId(`spotify:playlist:${ID}`)).toBe(ID);
  });

  it("is idempotent on a bare id, so running it on its own output is a no-op", () => {
    expect(playlistId(ID)).toBe(ID);
  });

  it("trims surrounding whitespace from a pasted link", () => {
    expect(playlistId(`  https://open.spotify.com/playlist/${ID}  `)).toBe(ID);
  });

  it("refuses another resource type carrying an equally valid id", () => {
    expect(playlistId(`https://open.spotify.com/album/${ID}`)).toBeNull();
    expect(playlistId(`spotify:track:${ID}`)).toBeNull();
  });

  it("refuses an id of the wrong length or alphabet", () => {
    expect(playlistId("https://open.spotify.com/playlist/tooshort")).toBeNull();
    expect(playlistId(`https://open.spotify.com/playlist/${ID}extra`)).toBeNull();
    expect(playlistId(`https://open.spotify.com/playlist/${ID.slice(0, 21)}-`)).toBeNull();
  });

  it("refuses anything that is not a link at all", () => {
    expect(playlistId("not a url")).toBeNull();
    expect(playlistId("")).toBeNull();
    expect(playlistId(null)).toBeNull();
    expect(playlistId(undefined)).toBeNull();
  });
});
