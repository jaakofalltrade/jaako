/**
 * Small array and map work that has nowhere better to live.
 */

/**
 * The value that appears most often, or null for an empty list.
 *
 * Ties go to whichever was seen first, which is deliberate rather than incidental:
 * the caller passes values in a meaningful order — top artists come back ranked — so
 * "first among equals" is the more useful answer than an arbitrary one, and it makes
 * the result stable across calls with the same input.
 */
export const mostCommon = (values: string[]): string | null => {
  const counts = new Map<string, number>();

  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  let best: string | null = null;
  let bestCount = 0;

  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });

  return best;
};
