import "server-only";
import { createHash } from "node:crypto";
import { NAME_LIMITS } from "@/constants";
import { normalizeTerm } from "./normalizeTerm";
import BLOCKED_TERM_HASHES from "./blockedTerms.json";

/**
 * The slur filter, and the reason there is not a list of slurs in this repository.
 *
 * blockedTerms.json holds SHA-256 hashes, not words. The plaintext list lives in
 * blocklist.txt, which .gitignore excludes, and scripts/build-blocklist.ts turns one
 * into the other. So the filter is reviewable in behaviour and the terms it blocks
 * never appear in a public portfolio that a recruiter may well be reading.
 *
 * WHY HASHING IS AFFORDABLE HERE AND WOULD NOT BE ANYWHERE ELSE. Hashes only support
 * exact matching, so the usual objection is that you cannot test whether a hash is
 * CONTAINED in a longer string. That objection dies against a ten-character field:
 * a normalised name has at most 36 substrings of three characters or more, so every
 * one of them can simply be hashed and looked up. The name cap is what makes this
 * work, and shortening the cap makes it cheaper rather than harder. If the field ever
 * grows past about twenty characters, revisit this: the substring count is quadratic.
 *
 * SUBSTRING MATCHING IS AGGRESSIVE ON PURPOSE AND WILL PRODUCE FALSE POSITIVES. A
 * display name is one token with no spaces, so a slur padded into "xxwordxx" is only
 * catchable by looking inside the string, and looking inside the string is also how
 * an innocent name catches a short blocked term it happens to contain. There is no
 * setting that avoids both. The mitigation is to keep blocklist.txt to unambiguous
 * terms and to keep the shortest of them long: a three-letter entry will misfire, a
 * six-letter one very rarely will.
 *
 * NOT A MODERATION SYSTEM. It stops the accidental and the lazy. Somebody determined
 * to get something through ten characters eventually will, and the real backstop is
 * that you delete the track in Spotify and the row goes with it.
 */

const sha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

/**
 * Every substring of `term` at least NAME_LIMITS.min characters long.
 *
 * The floor is the name minimum rather than 1 because a blocked term shorter than the
 * shortest allowed name could never be a name on its own, and checking two-character
 * fragments buys nothing but false positives.
 */
const substrings = (term: string): string[] => {
  const found: string[] = [];

  for (let start = 0; start < term.length; start += 1) {
    for (let end = start + NAME_LIMITS.min; end <= term.length; end += 1) {
      found.push(term.slice(start, end));
    }
  }

  return found;
};

/**
 * Built from a hash list rather than reading one, so a test can hand it the hash of a
 * harmless word and check the mechanism without this repository or its test suite
 * containing a single slur. The exported `blocklist` below is the real one.
 */
export const createBlocklist = (args: { hashes: string[] }) => {
  const blocked = new Set(args.hashes);

  return {
    /** True when any substring of the normalised name is on the list. */
    blocks: (name: string): boolean => {
      if (!blocked.size) return false;

      const normalized = normalizeTerm(name);
      if (normalized.length < NAME_LIMITS.min) return false;

      return substrings(normalized).some((candidate) => blocked.has(sha256(candidate)));
    },
  };
};

/**
 * The live filter.
 *
 * blockedTerms.json ships empty, and an empty list means this passes everything. That
 * is the honest default rather than a broken one: the alternative was committing
 * somebody's guess at a word list, and a filter you did not choose the contents of is
 * worse than one that is plainly switched off. See docs/suggest-setup.md to turn it on.
 */
export const blocklist = createBlocklist({ hashes: BLOCKED_TERM_HASHES });
