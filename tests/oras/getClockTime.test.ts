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
  });
});
