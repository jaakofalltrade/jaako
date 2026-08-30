import { describe, expect, it } from "vitest";
import { clock, runtime, shortDate, toDigits } from "@/utils/format";

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

describe("runtime", () => {
  it("renders hours and minutes", () => {
    expect(runtime(3 * 3_600_000 + 41 * 60_000)).toBe("3 hr 41 min");
  });

  it("drops the hour under an hour", () => {
    expect(runtime(41 * 60_000)).toBe("41 min");
  });

  it("drops the minutes on a whole hour", () => {
    expect(runtime(2 * 3_600_000)).toBe("2 hr");
  });

  /* The rounding must not carry into the hour and leave "0 hr 60 min" behind. */
  it("carries a rounded 60 minutes into the hour", () => {
    expect(runtime(59 * 60_000 + 40_000)).toBe("1 hr");
    expect(runtime(3_600_000 + 59 * 60_000 + 40_000)).toBe("2 hr");
  });

  /* "0 min" for a playlist with one short track reads as a bug rather than a length. */
  it("says under a min rather than 0 min for a non-empty span", () => {
    expect(runtime(20_000)).toBe("under a min");
  });

  it("is 0 min at exactly zero", () => {
    expect(runtime(0)).toBe("0 min");
  });

  /* This renders a sum, and a sum over a partial API response can arrive as anything. */
  it("clamps a negative and survives NaN", () => {
    expect(runtime(-5000)).toBe("0 min");
    expect(runtime(Number.NaN)).toBe("0 min");
  });

  /* The real playlist today: one track, 236560ms. */
  it("renders the lab playlist as it stands", () => {
    expect(runtime(236_560)).toBe("4 min");
  });
});

describe("shortDate", () => {
  const now = new Date("2026-08-30T00:00:00Z");

  it("drops the year for a date in the current one", () => {
    expect(shortDate({ iso: "2026-08-30T07:10:24Z", now })).toBe("30 aug");
  });

  /* The year comes back the moment it is informative, which is the whole rule. */
  it("keeps a two-digit year for any other year", () => {
    expect(shortDate({ iso: "2025-12-01T00:00:00Z", now })).toBe("1 dec 25");
  });

  it("is lowercase, to match the rest of the type on the page", () => {
    expect(shortDate({ iso: "2026-01-05T00:00:00Z", now })).toBe("5 jan");
  });

  /* Rendered into a table cell, so nothing is better than "Invalid Date". */
  it("is empty for an unparseable or missing value", () => {
    expect(shortDate({ iso: "not a date", now })).toBe("");
    expect(shortDate({ iso: "", now })).toBe("");
  });

  /* Formatted in UTC on purpose: Spotify stamps added_at in UTC, and letting the
     server's zone shift it would put a track on the wrong day either side of midnight. */
  it("reads the timestamp in UTC rather than the local zone", () => {
    expect(shortDate({ iso: "2026-03-01T23:30:00Z", now })).toBe("1 mar");
  });
});
