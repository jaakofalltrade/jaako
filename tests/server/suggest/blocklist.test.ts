import { DataSet, RegExpMatcher, englishRecommendedTransformers, pattern } from "obscenity";
import { describe, expect, it } from "vitest";
import { blocklist, createBlocklist } from "@/server/suggest/blocklist";

/**
 * The name filter.
 *
 * Two halves, and the split is deliberate. The mechanism is proved against a dataset
 * of harmless words, so this file contains no profanity; the real filter is only ever
 * asked to LET THINGS THROUGH, which is the half that can be tested with ordinary
 * names and is also the half that used to be broken.
 *
 * createBlocklist takes its matcher as an argument precisely so the first half can
 * exist at all.
 */

const harmless = new DataSet<{ originalWord: string }>().addPhrase((phrase) =>
  phrase.setMetadata({ originalWord: "kumquat" }).addPattern(pattern`kumquat`)
);

const stubbed = createBlocklist({
  matcher: new RegExpMatcher({ ...harmless.build(), ...englishRecommendedTransformers }),
});

describe("createBlocklist", () => {
  it("blocks a term in its dataset", () => {
    expect(stubbed.blocks("kumquat")).toBe(true);
  });

  /* A display name is one token with no spaces, so a term padded into a longer string
     is only catchable by looking inside it. */
  it("blocks the term inside a longer name", () => {
    expect(stubbed.blocks("xxkumquatxx")).toBe(true);
  });

  it("blocks it whatever the case", () => {
    expect(stubbed.blocks("KuMqUaT")).toBe(true);
  });

  /* The transformers the library recommends, which is the work the old hand-rolled
     normaliser was doing by hand and less well. */
  it("blocks leetspeak", () => {
    expect(stubbed.blocks("kumqu4t")).toBe(true);
  });

  it("allows a name that has nothing to do with it", () => {
    expect(stubbed.blocks("mona")).toBe(false);
  });

  it("does not throw on an empty name", () => {
    expect(stubbed.blocks("")).toBe(false);
  });
});

describe("blocklist", () => {
  /* THE REASON THIS REPLACED THE HAND-ROLLED FILTER, PINNED.
     The old one hashed every substring of the name and looked each up, so a short
     entry in the list would refuse any name containing it. There was no setting that
     avoided both that and missing a padded term. Every name below is ordinary, and
     several of them contain a swear as a substring: this is the Scunthorpe family, and
     refusing any of them would be a real person told to pick another name. */
  it.each([
    "mona",
    "jaako",
    "scunthorpe",
    "assassin",
    "analyst",
    "class",
    "grapes",
    "shitake",
    "cockburn",
    "hello",
  ])("lets the ordinary name %s through", (name) => {
    expect(blocklist.blocks(name)).toBe(false);
  });

  it("does not throw on an empty name", () => {
    expect(blocklist.blocks("")).toBe(false);
  });

  /* Whatever the dataset holds, a name of the maximum length must be answerable
     without the matcher being handed something it cannot parse. */
  it("answers for a name at the length limit", () => {
    expect(typeof blocklist.blocks("m".repeat(10))).toBe("boolean");
  });
});
