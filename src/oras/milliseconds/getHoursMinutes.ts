/**
 * A long span as "3 hr 41 min", for a playlist's total runtime.
 *
 * MINUTES ROUND, AND THE HOUR IS TAKEN FIRST so the rounding cannot carry into it.
 * 59 minutes and 40 seconds reads as "1 hr", not as "0 hr 60 min".
 *
 * Under an hour drops the hour entirely, and under a minute is "under a min" rather
 * than "0 min", which reads as an error. Negative and NaN clamp to zero for the same
 * reason getMinutesSeconds does: this renders a sum, and a sum taken over a partial
 * API response can arrive as anything.
 */
export const getHoursMinutes = {
  /** "3 hr 41 min", "41 min", "3 hr", or "under a min". */
  fromMilliseconds: (args: { milliseconds: number }): string => {
    const safe = Number.isFinite(args.milliseconds) ? Math.max(0, args.milliseconds) : 0;

    const hours = Math.floor(safe / 3_600_000);
    const minutes = Math.round((safe - hours * 3_600_000) / 60_000);

    // Rounding can land on 60, which would read as "2 hr 60 min".
    const carried = minutes === 60 ? { hours: hours + 1, minutes: 0 } : { hours, minutes };

    if (!carried.hours && !carried.minutes) return safe > 0 ? "under a min" : "0 min";
    if (!carried.hours) return `${carried.minutes} min`;
    if (!carried.minutes) return `${carried.hours} hr`;
    return `${carried.hours} hr ${carried.minutes} min`;
  },
};
