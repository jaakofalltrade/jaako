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
});
