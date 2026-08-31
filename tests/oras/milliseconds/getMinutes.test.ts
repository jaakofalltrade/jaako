import { describe, expect, it } from "vitest";
import { getMinutes } from "@/oras/milliseconds";

const from = (milliseconds: number) => getMinutes.fromMilliseconds({ milliseconds });

describe("getMinutes", () => {
  it("counts whole minutes", () => {
    expect(from(3 * 60_000)).toBe(3);
  });

  /* Truncates rather than rounds: a caller asking for whole minutes is asking how many
     have finished happening, and the 59th second of the second minute is not one. */
  it("truncates a partial minute rather than rounding it", () => {
    expect(from(119_000)).toBe(1);
    expect(from(59_999)).toBe(0);
  });

  it("counts past the hour rather than wrapping", () => {
    expect(from(3_700_000)).toBe(61);
  });

  it("clamps a negative and survives NaN, as everything in this folder does", () => {
    expect(from(-60_000)).toBe(0);
    expect(from(Number.NaN)).toBe(0);
  });
});
