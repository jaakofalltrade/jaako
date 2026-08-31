/**
 * The shapes a date is allowed to be rendered in.
 *
 * LUXON TOKENS, NOT Intl OPTION OBJECTS, and the two are not interchangeable. These
 * are read by DateTime.toFormat, where `LLL` is a short month name and `d` is a day
 * with no leading zero. The same strings handed to Intl.DateTimeFormat mean nothing at
 * all, and Intl's option objects mean nothing to toFormat.
 *
 * EVERY FORMAT HERE IS FIXED RATHER THAN LOCALE-DERIVED, which is the decision
 * src/utils/format.ts made first and this folder inherits: a readout that reorders
 * itself per visitor would be the only element on the page whose shape depends on who
 * is looking at it, sitting beside coordinates and plate numbers that never move.
 *
 * So the split is deliberate, and it is the one thing about this folder that surprises
 * people: THE ZONE IS THE VISITOR'S, THE SHAPE IS NOT. A reader in Berlin sees their
 * own Tuesday, written the way everybody else sees theirs.
 */
export const DATE_TIME_FORMAT = {
  /** "30 aug" - a suggestion from this year, where the year would only be noise. */
  short_day: "d LLL",
  /** "30 aug 25" - the same row once it is not this year and the year is news. */
  short_day_year: "d LLL yy",
  /** "14:07:23" - the status strip's clock. 24-hour and zero-padded, everywhere. */
  clock_seconds: "HH:mm:ss",
} as const;
