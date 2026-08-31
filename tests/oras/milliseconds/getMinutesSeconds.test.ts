import { describe, expect, it } from "vitest";
import { getMinutesSeconds } from "@/oras/milliseconds";

const from = (milliseconds: number) => getMinutesSeconds.fromMilliseconds({ milliseconds });

describe("getMinutesSeconds", () => {
  it("renders milliseconds as m:ss", () => {
    expect(from(215_000)).toBe("3:35");
  });

  it("pads the seconds to two digits", () => {
    expect(from(65_000)).toBe("1:05");
  });

  it("is 0:00 at zero", () => {
    expect(from(0)).toBe("0:00");
  });

  /* Clamped rather than rendering "-1:-5". The progress readout extrapolates from a
     load-time position, so a negative can genuinely arrive. */
  it("clamps a negative to zero", () => {
    expect(from(-5000)).toBe("0:00");
  });

  it("rounds to the nearest second", () => {
    expect(from(1600)).toBe("0:02");
  });

  it("does not roll over into hours", () => {
    expect(from(3_600_000)).toBe("60:00");
  });
});
