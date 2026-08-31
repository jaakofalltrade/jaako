import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getShortDate, Timezone } from "@/oras";

/*
 * THE CLOCK IS FAKED RATHER THAN INJECTED, which is what let getShortDate drop the
 * optional `now: Date` parameter its predecessor carried purely so a test could pin it.
 * Luxon reads Settings.now, which defaults to Date.now, so vi.setSystemTime moves it
 * with nothing to stub - see the note in src/oras/settings.ts.
 */
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-30T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

const from = (iso_date_time_utc: string, timezone: Timezone) =>
  getShortDate.fromIsoDateTimeUtc({ iso_date_time_utc, timezone });

describe("getShortDate", () => {
  it("drops the year for a date in the current one", () => {
    expect(from("2026-08-30T07:10:24Z", Timezone.Utc)).toBe("30 aug");
  });

  /* The year comes back the moment it is informative, which is the whole rule. */
  it("keeps a two-digit year for any other year", () => {
    expect(from("2025-12-01T00:00:00Z", Timezone.Utc)).toBe("1 dec 25");
  });

  it("is lowercase, to match the rest of the type on the page", () => {
    expect(from("2026-01-05T00:00:00Z", Timezone.Utc)).toBe("5 jan");
  });

  /*
   * THE POINT OF THE WHOLE REFACTOR, IN ONE ASSERTION. One instant, two readers, two
   * different days - and both of them right. Half past eleven at night in London is
   * already the next morning in Manila, so a row added then belongs on different dates
   * depending on who is looking at the list.
   */
  it("renders one instant on each reader's own calendar", () => {
    expect(from("2026-03-01T23:30:00Z", Timezone.Utc)).toBe("1 mar");
    expect(from("2026-03-01T23:30:00Z", Timezone.Manila)).toBe("2 mar");
    expect(from("2026-03-01T23:30:00Z", Timezone.Sydney)).toBe("2 mar");
  });

  /*
   * Sydney is two hours ahead of Manila, so there is a window each evening where the
   * two are on different dates and a row sits under a different heading for each.
   */
  it("separates two zones that are only two hours apart", () => {
    expect(from("2026-08-30T14:30:00Z", Timezone.Manila)).toBe("30 aug");
    expect(from("2026-08-30T14:30:00Z", Timezone.Sydney)).toBe("31 aug");
  });

  /*
   * DAYLIGHT SAVING, WHICH NOTHING ANCHORED TO MANILA CAN TEST. These two instants are
   * a full hour apart and both land on 02:30 in Sydney, because that is the morning its
   * clocks go back and the hour is lived through twice. The date has to come out the
   * same for both, and a fixed-offset shortcut would put one of them on the wrong day.
   */
  it("survives the hour Sydney repeats when its clocks go back", () => {
    expect(from("2026-04-04T15:30:00Z", Timezone.Sydney)).toBe("5 apr");
    expect(from("2026-04-04T16:30:00Z", Timezone.Sydney)).toBe("5 apr");
  });

  /*
   * A correction to the version this replaces, which compared UTC years. On the last
   * evening of December a Manila reader is already in the new year, so a timestamp that
   * is "last year" in UTC is this year to them - and labelling it "25" would be telling
   * them a row they are looking at today happened in a year they have left.
   */
  it("decides this year on the reader's calendar rather than in UTC", () => {
    expect(from("2025-12-31T20:00:00Z", Timezone.Utc)).toBe("31 dec 25");
    expect(from("2025-12-31T20:00:00Z", Timezone.Manila)).toBe("1 jan");
  });

  /* The same rule, on a zone that is into the new year earlier still - 13:00Z, because
     Sydney is on daylight saving at the end of December and running at UTC+11. */
  it("drops the year for a reader whose new year has already started", () => {
    expect(from("2025-12-31T13:00:00Z", Timezone.Utc)).toBe("31 dec 25");
    expect(from("2025-12-31T13:00:00Z", Timezone.Manila)).toBe("31 dec 25");
    expect(from("2025-12-31T13:00:00Z", Timezone.Sydney)).toBe("1 jan");
  });

  /*
   * It returned "" for these. Nothing in this app lets a human type a date, so an
   * unparseable one is a bug in a mapper rather than bad input, and a blank cell is the
   * shape of failure that reaches production unnoticed. See src/oras/settings.ts.
   */
  it("throws on an unparseable value rather than rendering a blank cell", () => {
    expect(() => from("not a date", Timezone.Utc)).toThrow();
    expect(() => from("", Timezone.Utc)).toThrow();
  });
});
