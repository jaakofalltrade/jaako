/**
 * How a string is flattened before it is hashed or looked up.
 *
 * SHARED BY THE BUILD SCRIPT AND THE RUNTIME, AND THAT IS THE ONLY THING KEEPING THE
 * BLOCKLIST WORKING. scripts/build-blocklist.ts hashes the output of this function;
 * server/suggest/blocklist.ts hashes candidate substrings with the same function and
 * compares. If the two ever normalised differently, every hash would simply stop
 * matching and the filter would pass everything, silently, with nothing failing and
 * nothing to see. That is the same class of drift contactRules.ts exists to prevent,
 * which is why the script is TypeScript run through tsx rather than a second copy of
 * this in a .mjs.
 *
 * No `server-only` here even though its callers are server-side: the build script is
 * not a server component and importing the guard would stop it running.
 *
 * WHAT THIS CANNOT DO. It flattens the obvious evasions and none of the clever ones.
 * Somebody who wants a slur through a ten-character field will eventually get one
 * through; the honest goal is that nobody does it by ACCIDENT and that the lazy
 * attempts bounce. The real backstop is that you can delete the track in Spotify and
 * the row goes with it.
 */

/** Digits and symbols that stand in for letters. Deliberately short: every entry here is a way to create a false positive as well as a way to catch an evasion. */
const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
};

const COMBINING_MARKS = /[\u0300-\u036f]/g;
const NON_LETTERS = /[^a-z]/g;

/**
 * Lowercase, de-accented, de-leeted, and stripped to letters.
 *
 * The order matters. NFKD first, so an accented character becomes a plain one plus a
 * combining mark that the next step removes; without it "niño" and "nino" hash
 * differently. Leet substitution before the non-letter strip, or the digits it maps
 * would already be gone.
 */
export const normalizeTerm = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .split("")
    .map((character) => LEET[character] ?? character)
    .join("")
    .replace(NON_LETTERS, "");
