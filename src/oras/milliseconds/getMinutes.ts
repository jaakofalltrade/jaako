/**
 * Whole minutes in a span, as a number rather than as something to print.
 *
 * The one function here that is not a formatter, which is why it exists separately
 * from getMinutesSeconds and getHoursMinutes: those two answer "what should the reader
 * see", and this answers "how many minutes is that", which is a question a comparison
 * or a threshold asks and a template never does.
 *
 * Truncates rather than rounds. A span of 119 seconds is one whole minute; the second
 * one has not finished happening, and a caller asking for whole minutes is asking how
 * many have completed.
 */
export const getMinutes = {
  /** 3_700_000 is 61. Negative and NaN clamp to 0, as everything in this folder does. */
  fromMilliseconds: (args: { milliseconds: number }): number => {
    const safe = Number.isFinite(args.milliseconds) ? Math.max(0, args.milliseconds) : 0;
    return Math.floor(safe / 60_000);
  },
};
