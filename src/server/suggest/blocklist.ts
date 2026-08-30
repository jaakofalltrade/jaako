import "server-only";
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";

/**
 * The name filter.
 *
 * This was a hand-rolled thing: a normaliser that flattened leetspeak, a list of
 * SHA-256 hashes committed in place of the words, and a check that hashed every
 * substring of the name and looked each one up. It worked, it kept the terms out of a
 * public repository, and it had a flaw written into its own header — substring
 * matching over a ten-character field cannot tell a padded slur from an innocent name
 * that happens to contain a short one, and no setting avoided both.
 *
 * obscenity solves the half that was unsolvable there. Measured before adopting it:
 * scunthorpe, assassin, analyst, class, grapes and shitake all pass, which is the
 * Scunthorpe family the old version could only have handled by keeping every entry
 * long and hoping. It also brings a maintained English dataset, so there is no word
 * list in this repository and none for anybody to write.
 *
 * WHY A LIBRARY HERE AND NOT FOR VALIDATION. The same question got the opposite answer
 * when Zod was removed, and the test is the same one: Zod replaced a handful of simple,
 * stable conditions that could be read in one sitting. Profanity matching is
 * adversarial and unbounded, the conditions are not enumerable, and somebody else
 * maintains them. Zero runtime dependencies of its own, and it never reaches the
 * browser — the filter is server-side, which is the point of it living in this folder
 * rather than in utils/nameRules.ts beside the length rules.
 *
 * A HEURISTIC, NOT A JUDGE, which is the library author's own framing and worth
 * repeating here. It stops the accidental and the lazy. Somebody determined to get
 * something through ten characters eventually will, and the real backstop is that you
 * delete the track in Spotify and the row goes with it.
 *
 * FALSE POSITIVES ARE FIXED IN THE DATASET, NOT IN CALLING CODE. If a real name is
 * ever refused, add a whitelisted term to a copy of englishDataset here rather than
 * special-casing it at the call site; obscenity exposes that on the DataSet builder.
 */

/** Structural, so a test can hand this a matcher built from harmless words. */
export type ProfanityMatcher = {
  hasMatch: (input: string) => boolean;
};

const englishMatcher: ProfanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/**
 * Built from a matcher rather than reaching for one, so the mechanism can be proved
 * against words like "kumquat" and this repository's test suite stays free of
 * profanity. The exported `blocklist` below is the real one.
 */
export const createBlocklist = (args: { matcher: ProfanityMatcher }) => ({
  /** True when the name matches anything in the dataset. Expects a normalised name. */
  blocks: (name: string): boolean => Boolean(name) && args.matcher.hasMatch(name),
});

export const blocklist = createBlocklist({ matcher: englishMatcher });
