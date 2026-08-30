import { describe, expect, it } from "vitest";
import { clock, toDigits } from "./format";

describe("clock", () => {
  it("renders milliseconds as m:ss", () => {
    expect(clock(215_000)).toBe("3:35");
  });

  it("pads the seconds to two digits", () => {
    expect(clock(65_000)).toBe("1:05");
  });

  it("is 0:00 at zero", () => {
    expect(clock(0)).toBe("0:00");
  });

  /* Clamped rather than rendering "-1:-5". The progress readout extrapolates from a
     load-time position, so a negative can genuinely arrive. */
  it("clamps a negative to zero", () => {
    expect(clock(-5000)).toBe("0:00");
  });

  it("rounds to the nearest second", () => {
    expect(clock(1600)).toBe("0:02");
  });

  it("does not roll over into hours", () => {
    expect(clock(3_600_000)).toBe("60:00");
  });
});

describe("toDigits", () => {
  it("pads a short count to the requested width", () => {
    expect(toDigits({ count: 42, length: 5 })).toEqual(["0", "0", "0", "4", "2"]);
  });

  it("is all zeroes at zero", () => {
    expect(toDigits({ count: 0, length: 3 })).toEqual(["0", "0", "0"]);
  });

  /* The odometer has a fixed number of cells, so an overflowing count keeps its least
     significant digits rather than pushing the layout wider. */
  it("keeps the last digits when the count is wider than the field", () => {
    expect(toDigits({ count: 1_234_567, length: 4 })).toEqual(["4", "5", "6", "7"]);
  });
});
