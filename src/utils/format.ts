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
 * A play count as a deepcuts card prints it.
 *
 * Grouped rather than abbreviated, so 1,204,331 stays 1,204,331 and does not become
 * "1.2M". The exact figure is the thing being compared on these cards: the whole app
 * is an argument about which of two numbers is smaller, and rounding both to one
 * decimal place throws away the argument. A card has room for the digits.
 *
 * "en-GB" is hardcoded to match VisitorIndex, and for the same reason: the separator
 * has to be the same on the server and in the browser or the number changes after
 * hydration. The visitor's own locale is not available during a static render.
 *
 * Null is a real answer rather than a missing one: last.fm could not match the track.
 * It comes back as the word, not as a zero and not as a dash. A zero would grade the
 * card as the rarest thing in the pack, which is precisely backwards, and a dash makes
 * a reader wonder whether the number failed to load.
 */
export const getPlayCount = (plays: number | null): string =>
  plays === null ? "unmatched" : plays.toLocaleString("en-GB");
