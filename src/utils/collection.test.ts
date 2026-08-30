import { describe, expect, it } from "vitest";
import { mostCommon } from "./collection";

describe("mostCommon", () => {
  it("returns the value that appears most often", () => {
    expect(mostCommon(["rock", "jazz", "rock"])).toBe("rock");
  });

  /* The documented tie-break, and the reason it is documented: callers pass values in
     a meaningful order — top artists come back ranked — so first among equals is the
     more useful answer, and it makes the result stable across identical calls. */
  it("gives a tie to whichever was seen first", () => {
    expect(mostCommon(["jazz", "rock", "jazz", "rock"])).toBe("jazz");
  });

  it("is null for an empty list", () => {
    expect(mostCommon([])).toBeNull();
  });

  it("returns the only value when there is one", () => {
    expect(mostCommon(["shoegaze"])).toBe("shoegaze");
  });

  /* Where this actually lands: Spotify tags artists, not tracks, so modalGenre flat-maps
     several artists' genre arrays into one list with heavy repetition. */
  it("survives a long list with a clear winner", () => {
    const genres = [...Array<string>(9).fill("indie"), "jazz", "jazz"];
    expect(mostCommon(genres)).toBe("indie");
  });
});
