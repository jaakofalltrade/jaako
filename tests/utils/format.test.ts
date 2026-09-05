import { describe, expect, it } from "vitest";
import { getDigitCells, getPlayCount } from "@/utils/format";

/*
 * clock, runtime and shortDate moved to src/oras and took their tests with them:
 * tests/oras/milliseconds/getMinutesSeconds.test.ts, getHoursMinutes.test.ts and
 * tests/oras/getShortDate.test.ts. What is left here is the one formatter in the file
 * that was never about time.
 */

describe("getDigitCells", () => {
  it("pads a short count to the requested width", () => {
    expect(getDigitCells({ count: 42, length: 5 })).toEqual(["0", "0", "0", "4", "2"]);
  });

  it("is all zeroes at zero", () => {
    expect(getDigitCells({ count: 0, length: 3 })).toEqual(["0", "0", "0"]);
  });

  /* The odometer has a fixed number of cells, so an overflowing count keeps its least
     significant digits rather than pushing the layout wider. */
  it("keeps the last digits when the count is wider than the field", () => {
    expect(getDigitCells({ count: 1_234_567, length: 4 })).toEqual(["4", "5", "6", "7"]);
  });
});

describe("getPlayCount", () => {
  it("groups a large count rather than abbreviating it", () => {
    expect(getPlayCount(48_912_004)).toBe("48,912,004");
  });

  it("leaves a small count alone", () => {
    expect(getPlayCount(417)).toBe("417");
  });

  /*
   * The separator is pinned to en-GB rather than taken from the runtime, because a
   * card is rendered on the server and hydrated in a browser that may not agree about
   * it. A test that asserted the ambient locale would pass everywhere and prove
   * nothing.
   */
  it("groups on the thousand at the first boundary", () => {
    expect(getPlayCount(1_000)).toBe("1,000");
  });

  /*
   * Null is last.fm failing to match the track, and it is not zero. A zero would sort
   * the card to the rarest rung in the pack, which is exactly backwards, so the
   * distinction has to survive as far as the card face.
   */
  it("says so when the track was never matched", () => {
    expect(getPlayCount(null)).toBe("unmatched");
  });

  it("does not confuse an unmatched track with one nobody has played", () => {
    expect(getPlayCount(0)).toBe("0");
  });
});
