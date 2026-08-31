import { describe, expect, it } from "vitest";
import { getHoursMinutes } from "@/oras/milliseconds";

const from = (milliseconds: number) => getHoursMinutes.fromMilliseconds({ milliseconds });

describe("getHoursMinutes", () => {
  it("renders hours and minutes", () => {
    expect(from(3 * 3_600_000 + 41 * 60_000)).toBe("3 hr 41 min");
  });

  it("drops the hour under an hour", () => {
    expect(from(41 * 60_000)).toBe("41 min");
  });

  it("drops the minutes on a whole hour", () => {
    expect(from(2 * 3_600_000)).toBe("2 hr");
  });

  /* The rounding must not carry into the hour and leave "0 hr 60 min" behind. */
  it("carries a rounded 60 minutes into the hour", () => {
    expect(from(59 * 60_000 + 40_000)).toBe("1 hr");
    expect(from(3_600_000 + 59 * 60_000 + 40_000)).toBe("2 hr");
  });

  /* "0 min" for a playlist with one short track reads as a bug rather than a length. */
  it("says under a min rather than 0 min for a non-empty span", () => {
    expect(from(20_000)).toBe("under a min");
  });

  it("is 0 min at exactly zero", () => {
    expect(from(0)).toBe("0 min");
  });

  /* This renders a sum, and a sum over a partial API response can arrive as anything. */
  it("clamps a negative and survives NaN", () => {
    expect(from(-5000)).toBe("0 min");
    expect(from(Number.NaN)).toBe("0 min");
  });

  /* The real playlist today: one track, 236560ms. */
  it("renders the lab playlist as it stands", () => {
    expect(from(236_560)).toBe("4 min");
  });
});
