/**
 * Turning numbers into something readable.
 *
 * The string work in here is the kind that's genuinely needed — there's no way
 * to render a duration or a split-flap counter without it.
 */

/** Milliseconds as m:ss, clamped at zero. */
export const clock = (ms: number): string => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/** A count as a fixed-width array of digits, for the split-flap hit counter. */
export const toDigits = (args: { count: number; length: number }): string[] => {
  const { count, length } = args;
  return String(count).padStart(length, "0").slice(-length).split("");
};

/**
 * A long span as "3 hr 41 min", for a playlist's total runtime.
 *
 * Separate from clock() rather than a mode of it, because they answer different
 * questions. m:ss is how long a track is, which a reader compares against other
 * tracks; "3 hr 41 min" is how much listening a playlist represents, and rendering
 * that as 221:00 would be technically correct and useless.
 *
 * MINUTES ROUND, AND THE HOUR IS TAKEN FIRST so the rounding cannot carry into it.
 * 59 minutes and 40 seconds reads as "1 hr", not as "0 hr 60 min".
 *
 * Under an hour drops the hour entirely, and under a minute is "under a min" rather
 * than "0 min", which reads as an error. Negative and NaN clamp to zero for the same
 * reason clock() does: this renders a sum, and a sum over a partial API response can
 * arrive as anything.
 */
export const runtime = (ms: number): string => {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0;

  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.round((safe - hours * 3_600_000) / 60_000);

  // Rounding can land on 60, which would read as "2 hr 60 min".
  const carried = minutes === 60 ? { hours: hours + 1, minutes: 0 } : { hours, minutes };

  if (!carried.hours && !carried.minutes) return safe > 0 ? "under a min" : "0 min";
  if (!carried.hours) return `${carried.minutes} min`;
  if (!carried.minutes) return `${carried.hours} hr`;
  return `${carried.hours} hr ${carried.minutes} min`;
};

/**
 * An ISO timestamp as a short date: "30 aug", or "30 aug 25" once it is not this year.
 *
 * The year is dropped for anything in the current one, which is where nearly every row
 * on a playlist people are still adding to will be. Carrying "2026" on twenty-four
 * consecutive rows is a column of noise that says nothing; the moment it becomes
 * informative, because a row is from last year, it comes back.
 *
 * en-GB rather than the reader's own locale, and that is a deliberate loss. Every other
 * readout on this site is a fixed format - the coordinates, the clock, the plate
 * numbers - and a date that reorders itself per visitor would be the only element whose
 * shape depends on who is looking at it. Lowercased to match the rest of the type.
 *
 * An unparseable or missing value comes back empty rather than as "Invalid Date",
 * because it renders into a table cell that can simply be blank.
 */
export const shortDate = (args: { iso: string; now?: Date }): string => {
  const when = new Date(args.iso);
  if (Number.isNaN(when.getTime())) return "";

  const thisYear = (args.now ?? new Date()).getUTCFullYear() === when.getUTCFullYear();

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: thisYear ? undefined : "2-digit",
    timeZone: "UTC",
  })
    .format(when)
    .toLowerCase();
};
