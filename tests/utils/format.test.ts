import { describe, expect, it } from "vitest";
import { getDigitCells } from "@/utils/format";

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
