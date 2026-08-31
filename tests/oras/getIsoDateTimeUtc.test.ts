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
   * change what gets stored. A row written by a request served in Manila and one served
   * in London are the same string for the same instant, so nothing in the database ever
   * needs to know where it was written.
   */
  it("gives one string for one instant, whatever zone it arrives in", () => {
    const manila = getDateTime.now({ timezone: Timezone.Manila });
    const utc = getDateTime.now({ timezone: Timezone.Utc });

    expect(getIsoDateTimeUtc.fromDateTime({ date_time: manila })).toBe(
      getIsoDateTimeUtc.fromDateTime({ date_time: utc })
    );
    expect(getIsoDateTimeUtc.fromDateTime({ date_time: manila })).toBe(
      "2026-08-30T07:10:24.000Z"
    );
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
   * which defaults to Date.now, and oras/milliseconds reads Date.now directly - so the
   * luxon side and the luxon-free side cannot drift apart under a fake clock.
   *
   * If someone ever assigns a custom Settings.now, this is the test that fails.
   */
  it("keeps the luxon and the plain-number halves on the same clock", () => {
    expect(getIsoDateTimeUtc.fromMilliseconds({ milliseconds: getEpochMilliseconds.now() })).toBe(
      getIsoDateTimeUtc.now()
    );
  });
});
