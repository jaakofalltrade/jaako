/**
 * Turning numbers into something readable.
 *
 * ONLY THE ONE THAT IS NOT ABOUT TIME IS STILL HERE. clock, runtime and shortDate
 * moved to src/oras when that folder was created: they were the three functions in
 * this file whose subject was a duration or a date, and splitting a codebase's time
 * handling across "the date folder" and "wherever it happened to be written" is
 * exactly the arrangement oras exists to end.
 *
 * They kept their behaviour and lost their old names, which now say what comes back
 * rather than what it is for — clock is getMinutesSeconds, runtime is getHoursMinutes,
 * both in "@/oras/milliseconds", and shortDate is getShortDate in "@/oras".
 */

/** A count as a fixed-width array of digits, for the split-flap hit counter. */
export const toDigits = (args: { count: number; length: number }): string[] => {
  const { count, length } = args;
  return String(count).padStart(length, "0").slice(-length).split("");
};
