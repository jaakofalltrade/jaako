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
