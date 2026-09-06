import { describe, expect, it } from "vitest";
import { mostCommon, uniqueBy } from "@/utils/collection";

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

describe("uniqueBy", () => {
  const key = (value: { id?: string }) => value.id;

  it("keeps a list with no repeats untouched", () => {
    const values = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(uniqueBy({ values, key })).toEqual(values);
  });

  /* THE CASE THIS WAS WRITTEN FOR. Spotify pages /me/playlists by offset over a
     collection whose order it does not promise, so an item can cross a page boundary
     between two requests and be read twice. Measured against a real 199-playlist
     library: two ids came back twice, and the only symptom was React refusing two
     children with the same key. */
  it("drops a later repeat", () => {
    expect(uniqueBy({ values: [{ id: "a" }, { id: "b" }, { id: "a" }], key })).toEqual([
      { id: "a" },
      { id: "b" },
    ]);
  });

  /* First occurrence wins, and the two copies are not always identical: the second is a
     later snapshot of the same playlist. Keeping the first is what makes the result
     match the order the pages were read in. */
  it("keeps the first of two, not the last", () => {
    expect(
      uniqueBy({ values: [{ id: "a", n: 1 }, { id: "a", n: 2 }], key: (v) => v.id })
    ).toEqual([{ id: "a", n: 1 }]);
  });

  it("preserves the order of what survives", () => {
    expect(
      uniqueBy({ values: [{ id: "c" }, { id: "a" }, { id: "c" }, { id: "b" }], key })
    ).toEqual([{ id: "c" }, { id: "a" }, { id: "b" }]);
  });

  /* Nothing with no key is collapsed into anything else. Two of them are two things,
     not one thing seen twice, and the caller is what decides whether a keyless entry
     belongs in the result at all. */
  it("keeps every entry that has no key", () => {
    expect(uniqueBy({ values: [{}, {}, { id: "a" }], key })).toEqual([{}, {}, { id: "a" }]);
  });

  it("is empty for an empty list", () => {
    expect(uniqueBy({ values: [], key })).toEqual([]);
  });
});
