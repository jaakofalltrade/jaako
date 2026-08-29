/**
 * Numeric guards. format.ts renders numbers; this one keeps them in range.
 */

/**
 * The value held between `min` and `max`.
 *
 * Deliberately NOT applied to every Math.max/Math.min in the codebase. Most of those
 * are one-sided floors and ceilings — a delay that cannot go negative, a scroll
 * duration with a minimum — where the other bound has no meaning and inventing one to
 * fit this signature would make the call longer and say less. It is used where the
 * value genuinely lives in a range with two ends, which is the progress readouts: a
 * fraction is 0 to 1 and a percentage is 0 to 100, whatever the arithmetic produces.
 */
export const clamp = (args: { value: number; min: number; max: number }): number => {
  const { value, min, max } = args;
  return Math.min(Math.max(value, min), max);
};
