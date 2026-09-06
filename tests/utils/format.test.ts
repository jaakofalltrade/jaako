import { describe, expect, it } from "vitest";
import { getDigitCells, compactCount } from "@/utils/format";

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

describe("compactCount", () => {
  it("shortens a seven figure count", () => {
    expect(compactCount(1_333_333)).toBe("1.3M");
  });

  it("shortens thousands and billions the same way", () => {
    expect(compactCount(48_000)).toBe("48K");
    expect(compactCount(2_400_000_000)).toBe("2.4B");
  });

  /* Compact notation already leaves small numbers alone: 847 is 847, not 0.8K. */
  it("leaves anything under a thousand as it is", () => {
    expect(compactCount(847)).toBe("847");
    expect(compactCount(0)).toBe("0");
  });

  it("rounds to one decimal rather than showing four", () => {
    expect(compactCount(1_249_999)).toBe("1.2M");
    expect(compactCount(1_000_000)).toBe("1M");
  });

  /* A count that is not a number is not a count. Empty rather than "NaN" reaching JSX. */
  it("is empty for a broken value", () => {
    expect(compactCount(Number.NaN)).toBe("");
    expect(compactCount(Number.POSITIVE_INFINITY)).toBe("");
  });
});
