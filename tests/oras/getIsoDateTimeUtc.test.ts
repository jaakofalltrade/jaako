import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDateTime, getIsoDateTimeUtc, Timezone } from "@/oras";
import { getEpochMilliseconds } from "@/oras/milliseconds";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-30T07:10:24.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getIsoDateTimeUtc", () => {
  it("is the current instant in UTC", () => {
    expect(getIsoDateTimeUtc.now()).toBe("2026-08-30T07:10:24.000Z");
  });

  /*
   * THE ONE PROPERTY EVERYTHING ELSE RESTS ON: the zone a DateTime is carrying does not
   * change what gets stored. A row written by a request served in Manila, one served in
   * Sydney and one served in London are the same string for the same instant, so nothing
   * in the database ever needs to know where it was written.
   *
   * Sydney matters here specifically because it is the one on daylight saving. If any of
   * this were doing arithmetic on offsets rather than carrying an instant, the zone
   * whose offset changes twice a year is where it would show.
   */
  it("gives one string for one instant, whatever zone it arrives in", () => {
    const written = [Timezone.Manila, Timezone.Sydney, Timezone.Utc].map((timezone) =>
      getIsoDateTimeUtc.fromDateTime({ date_time: getDateTime.now({ timezone }) })
    );

    expect(written).toEqual([
      "2026-08-30T07:10:24.000Z",
      "2026-08-30T07:10:24.000Z",
      "2026-08-30T07:10:24.000Z",
    ]);
  });

  /* The same, on the far side of a daylight saving change, where the offset differs. */
  it("still gives one string once Sydney has moved its clocks", () => {
    vi.setSystemTime(new Date("2026-01-05T07:10:24.000Z"));

    const sydney = getIsoDateTimeUtc.fromDateTime({
      date_time: getDateTime.now({ timezone: Timezone.Sydney }),
    });

    expect(sydney).toBe("2026-01-05T07:10:24.000Z");
    expect(getDateTime.now({ timezone: Timezone.Sydney }).toFormat("HH:mm")).toBe("18:10");
  });

  it("converts a JS Date", () => {
    expect(getIsoDateTimeUtc.fromJsDate({ js_date: new Date("2025-01-02T03:04:05Z") })).toBe(
      "2025-01-02T03:04:05.000Z"
    );
  });

  it("converts epoch milliseconds", () => {
    expect(getIsoDateTimeUtc.fromMilliseconds({ milliseconds: 0 })).toBe(
      "1970-01-01T00:00:00.000Z"
    );
  });

  /*
   * The claim src/oras/settings.ts makes about testing, checked rather than asserted:
   * ONE vi.setSystemTime MOVES BOTH HALVES OF THE FOLDER. Luxon reads Settings.now,
   * which defaults to Date.now, and oras/milliseconds reads Date.now directly.
   *
   * Each half is checked against a literal rather than against the other half, so this
   * cannot pass by both sides being wrong in the same direction - which is the objection
   * to writing it as one expression comparing the two.
   *
   * If someone ever assigns a custom Settings.now, the first assertion is what fails.
   */
  it("moves both halves of the folder from one setSystemTime", () => {
    vi.setSystemTime(new Date("2027-03-04T05:06:07.000Z"));

    expect(getIsoDateTimeUtc.now()).toBe("2027-03-04T05:06:07.000Z");
    expect(getEpochMilliseconds.now()).toBe(Date.parse("2027-03-04T05:06:07.000Z"));
  });
});
