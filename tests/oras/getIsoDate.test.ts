import { afterEach, describe, expect, it, vi } from "vitest";
import { getIsoDate, Timezone } from "@/oras";

afterEach(() => {
  vi.useRealTimers();
});

const at = (instant: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(instant));
};

describe("getIsoDate", () => {
  it("is today, with no time on it", () => {
    at("2026-08-30T09:00:00Z");
    expect(getIsoDate.now({ timezone: Timezone.Utc })).toBe("2026-08-30");
  });

  /*
   * THE BUG THIS FUNCTION EXISTS TO FIX, stated as a test. Six in the evening in London
   * is two in the morning of the NEXT DAY in Manila, so "what day is it" has two right
   * answers and Postgres was only ever giving one of them.
   *
   * The daily add cap counts against this key. While it came from current_date - UTC -
   * a visitor in Manila got a counter that reset at eight in the morning: they used
   * their three at nine in the evening and were still refused at half past midnight,
   * because the database was still on the previous afternoon.
   */
  it("is a different day in Manila than in UTC across the boundary", () => {
    at("2026-08-30T18:00:00Z");

    expect(getIsoDate.now({ timezone: Timezone.Utc })).toBe("2026-08-30");
    expect(getIsoDate.now({ timezone: Timezone.Manila })).toBe("2026-08-31");
  });

  /* Manila midnight itself: the moment the cap is now supposed to reset. */
  it("rolls over at Manila midnight rather than at UTC midnight", () => {
    at("2026-08-30T15:59:00Z");
    expect(getIsoDate.now({ timezone: Timezone.Manila })).toBe("2026-08-30");

    at("2026-08-30T16:00:00Z");
    expect(getIsoDate.now({ timezone: Timezone.Manila })).toBe("2026-08-31");
  });

  /*
   * Three zones, one instant, and two different answers to "what day is it". Sydney is
   * two hours further east than Manila, so it crosses into the new day first.
   */
  it("gives each zone its own day for the same instant", () => {
    at("2026-08-30T14:30:00Z");

    expect(getIsoDate.now({ timezone: Timezone.Utc })).toBe("2026-08-30");
    expect(getIsoDate.now({ timezone: Timezone.Manila })).toBe("2026-08-30");
    expect(getIsoDate.now({ timezone: Timezone.Sydney })).toBe("2026-08-31");
  });

  /*
   * THE ROLLOVER MOVES WITH DAYLIGHT SAVING, which is the thing no Manila assertion can
   * check. Sydney's day begins at 14:00Z in August (UTC+10) and at 13:00Z in December
   * (UTC+11), so a fixed offset subtracted from UTC would get one of these two wrong.
   */
  it("rolls over an hour earlier in UTC once Sydney is on daylight saving", () => {
    at("2026-08-30T13:59:00Z");
    expect(getIsoDate.now({ timezone: Timezone.Sydney })).toBe("2026-08-30");
    at("2026-08-30T14:00:00Z");
    expect(getIsoDate.now({ timezone: Timezone.Sydney })).toBe("2026-08-31");

    at("2025-12-31T12:59:00Z");
    expect(getIsoDate.now({ timezone: Timezone.Sydney })).toBe("2025-12-31");
    at("2025-12-31T13:00:00Z");
    expect(getIsoDate.now({ timezone: Timezone.Sydney })).toBe("2026-01-01");
  });
});
