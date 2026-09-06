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

/**
 * The list with later repeats of a key dropped, in the order they first appeared.
 *
 * WRITTEN FOR A MEASURED BUG, NOT A HYPOTHETICAL ONE. Spotify's GET /me/playlists is
 * paged by offset, and paging by offset over a collection whose order it does not
 * promise means an item can be pushed across a page boundary between two requests and
 * be read twice. Against a real library of 199 playlists, read in four pages of 50,
 * two ids came back twice. That is not an error anywhere: every request answered 200,
 * the totals agreed, and the only symptom was React refusing two children with the
 * same key.
 *
 * FIRST OCCURRENCE WINS, which matters because the two copies are not always identical
 * — the second is a later snapshot of the same playlist. Keeping the first is what
 * makes the result match the order the caller read the pages in.
 *
 * Deliberately not a Set: these are objects, and the identity we care about is a field
 * on them rather than the reference.
 */
export const uniqueBy = <T>(args: { values: T[]; key: (value: T) => string | undefined }): T[] => {
  const { values, key } = args;
  const seen = new Set<string>();

  return values.filter((value) => {
    const id = key(value);
    // Anything with no key cannot be compared, so it is kept rather than collapsed. A
    // caller that cares about the missing key is the one that should drop it, and this
    // one does: the mapper returns null for a playlist with no id.
    if (id === undefined) return true;
    if (seen.has(id)) return false;

    seen.add(id);
    return true;
  });
};
