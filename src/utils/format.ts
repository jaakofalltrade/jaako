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

/**
 * A count as one string per flap on the split-flap hit counter.
 *
 * Named for the cells rather than for the number, because that is what comes back: an
 * array of single-character strings, one per physical flap, not a digit and not a
 * count. The fixed width is the whole point - the counter has a set number of flaps, so
 * a short count is zero-padded up to it and an overflowing one keeps its least
 * significant digits rather than pushing the layout wider.
 */
export const getDigitCells = (args: { count: number; length: number }): string[] => {
  const { count, length } = args;
  return String(count).padStart(length, "0").slice(-length).split("");
};

/**
 * A play count at a glance: 1,333,333 becomes 1.3M.
 *
 * NO PACKAGE FOR THIS, AND NOT BECAUSE THE DEPENDENCY LIST IS PRECIOUS. `Intl` has done
 * compact notation natively in every browser and Node this site runs on for years, so a
 * library would be a download, a bundle entry and a version to keep current, wrapping a
 * one-line call to something already in the runtime. The wrapper is here rather than at
 * the call site only so the locale decision below lives in one place.
 *
 * THE LOCALE IS PINNED, WHICH IS THE ONLY SUBTLE PART. `toLocaleString()` with no locale
 * uses whatever the runtime's default is, and the server's default is not the visitor's:
 * the same number renders "1.3M" in one and "1,3 M" in another, which is a hydration
 * mismatch waiting for the first reader outside en-US. Pinning it makes the output a
 * property of this function rather than of wherever it happened to run.
 *
 * Counts below a thousand come back unchanged, which is what compact notation already
 * does: 847 is 847, not 0.8K.
 */
const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const compactCount = (value: number): string =>
  Number.isFinite(value) ? COMPACT.format(value) : "";
