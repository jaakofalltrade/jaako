import "./settings";
import { DATE_TIME_FORMAT, Timezone } from "./constants";
import { getDateTime } from "./getDateTime";

/**
 * A timestamp as a short date: "30 aug", or "30 aug 25" once it is not this year.
 *
 * The year is dropped for anything in the current one, which is where nearly every row
 * on a playlist people are still adding to will be. Carrying "2026" down twenty-four
 * consecutive rows is a column of noise that says nothing; the moment it becomes
 * informative, because a row really is from last year, it comes back.
 *
 * THIS YEAR IS DECIDED IN THE READER'S ZONE, NOT IN UTC, which is a quiet correction
 * to the version this replaces. It compared UTC years, so on the last day of December
 * a reader in Manila could see a row from their own current year carrying a year label
 * - and, worse, a row they added minutes ago suddenly growing one at their midnight.
 * Both dates now come from the same calendar, so the comparison is between two things
 * the reader would agree are comparable.
 *
 * The old signature carried an optional `now: Date` purely so a test could pin the
 * clock. It is gone: luxon reads Settings.now, which defaults to Date.now, so
 * vi.setSystemTime moves this and everything else in the folder at once. A parameter
 * that exists only for tests is one every caller has to read past forever.
 *
 * Unparseable input throws rather than returning "" - see the note in ./settings.ts
 * for why a blank cell was the wrong failure for data no human ever types.
 */
export const getShortDate = {
  /** A stored timestamp, on the reader's calendar. */
  fromIsoDateTimeUtc: (args: { iso_date_time_utc: string; timezone: Timezone }): string => {
    const when = getDateTime.fromIsoDateTimeUtc(args);
    const today = getDateTime.now({ timezone: args.timezone });

    const format =
      when.year === today.year ? DATE_TIME_FORMAT.short_day : DATE_TIME_FORMAT.short_day_year;

    // Lowercased to match the rest of the type on this site. Luxon gives "30 Aug".
    return when.toFormat(format).toLowerCase();
  },
};
