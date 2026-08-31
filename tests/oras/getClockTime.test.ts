import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClockTime, Timezone } from "@/oras";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-30T06:07:08Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getClockTime", () => {
  /*
   * 24-hour and zero-padded on every machine. Both halves of that come from oras rather
   * than from the caller now - the token in DATE_TIME_FORMAT.clock_seconds and the
   * pinned en-GB in settings.ts - which is what stops a reader in the United States
   * seeing "2:07:08 PM" in a fixed-width cell built for eight characters.
   */
  it("is 24-hour and zero-padded", () => {
    expect(getClockTime.now({ timezone: Timezone.Utc })).toBe("06:07:08");
  });

  /* The status strip's whole point: what time it is where the work happens. */
  it("reads the zone it is given rather than the machine's", () => {
    expect(getClockTime.now({ timezone: Timezone.Manila })).toBe("14:07:08");
    expect(getClockTime.now({ timezone: Timezone.Sydney })).toBe("16:07:08");
  });

  /*
   * THE OFFSET IS NOT A CONSTANT, and this is the assertion that says so. The same
   * wall-clock instant reads 16:07 in Sydney in August and 17:07 in January, because
   * Sydney is UTC+10 in winter and UTC+11 on daylight saving. Manila is flat all year,
   * so it cannot fail this way and cannot catch it either.
   */
  it("follows the zone through a daylight saving change", () => {
    expect(getClockTime.now({ timezone: Timezone.Sydney })).toBe("16:07:08");

    vi.setSystemTime(new Date("2026-01-05T06:07:08Z"));

    expect(getClockTime.now({ timezone: Timezone.Sydney })).toBe("17:07:08");
    // Manila, for contrast: the same reading in both seasons.
    expect(getClockTime.now({ timezone: Timezone.Manila })).toBe("14:07:08");
  });
});
