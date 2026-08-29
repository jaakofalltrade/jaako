/**
 * String work that isn't formatting.
 *
 * format.ts turns numbers into something readable; this is the other kind — taking a
 * string apart so two pieces of it can be styled differently.
 */

/**
 * The string without its trailing `suffix`, or unchanged if it doesn't end with one.
 *
 * The site writes several names as a whole string plus the tail that takes the warm
 * accent — HERO.title with title_accent, CONTACT_SPEC.name with name_accent — so the
 * copy stays one readable line in the data file and which half is warm stays a
 * presentation decision. Rendering one means splitting it back apart, and the two
 * places doing that had the same slice arithmetic written out longhand.
 *
 * Checks `endsWith` rather than trusting the caller. The old expression subtracted
 * lengths unconditionally, so a suffix that had drifted out of sync with its string
 * silently cut the wrong number of characters off the end instead of failing; this
 * returns the string whole, which is visible immediately.
 *
 * An empty suffix returns the text unchanged. Worth its own line because
 * `slice(0, -0)` is `slice(0, 0)` — the empty string — which is the one input that
 * would otherwise erase everything.
 */
export const dropSuffix = (args: { text: string; suffix: string }): string => {
  const { text, suffix } = args;
  if (!suffix || !text.endsWith(suffix)) return text;
  return text.slice(0, text.length - suffix.length);
};
