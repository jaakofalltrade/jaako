import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBlocklist } from "./blocklist";
import { normalizeTerm } from "./normalizeTerm";

/**
 * The blocklist, tested against harmless words.
 *
 * createBlocklist takes its hashes as an argument precisely so this file can exist:
 * the mechanism is what needs proving, and proving it does not require this repository
 * or its test suite to contain a single slur. "kumquat" and "badword" stand in for the
 * real list, which lives in a gitignored blocklist.txt and is never committed.
 */

/** The same pairing the build script performs: normalise, then hash. */
const hashOf = (term: string): string =>
  createHash("sha256").update(normalizeTerm(term), "utf8").digest("hex");

const list = createBlocklist({ hashes: [hashOf("kumquat"), hashOf("badword")] });

describe("createBlocklist", () => {
  it("blocks the term itself", () => {
    expect(list.blocks("kumquat")).toBe(true);
  });

  it("allows a name that has nothing to do with it", () => {
    expect(list.blocks("mona")).toBe(false);
  });

  /* A display name is one token with no spaces, so a term padded into a longer string
     is only catchable by looking inside it. This is the case that forces substring
     matching, and the same property is what makes false positives possible. */
  it("blocks the term hidden inside a longer name", () => {
    expect(list.blocks("xxkumquat")).toBe(true);
    expect(list.blocks("xkumquatx")).toBe(true);
  });

  it("blocks it whatever the case", () => {
    expect(list.blocks("KuMqUaT")).toBe(true);
  });

  /* The evasions normalizeTerm exists to flatten. Each of these is a different trick
     and all of them collapse to the same normalised string before hashing. */
  it("blocks leetspeak", () => {
    expect(list.blocks("b4dw0rd")).toBe(true);
  });

  it("blocks punctuation padding", () => {
    expect(list.blocks("b.a.d.w.o.r.d")).toBe(true);
  });

  it("blocks accented letters", () => {
    expect(list.blocks("bàdwörd")).toBe(true);
  });

  it("blocks digits mixed in around it", () => {
    expect(list.blocks("99badword")).toBe(true);
  });

  /* An empty list is the shipped default, and it must pass everything rather than
     nothing. A filter that blocked every name because it had not been configured would
     be a far worse failure than one that is plainly switched off. */
  it("passes everything when the list is empty", () => {
    const empty = createBlocklist({ hashes: [] });
    expect(empty.blocks("kumquat")).toBe(false);
  });

  /* Substrings shorter than the minimum name length are never checked, so a two-letter
     fragment of a blocked term does not trip it. */
  it("does not block a short fragment of a term", () => {
    expect(list.blocks("qu")).toBe(false);
    expect(list.blocks("kum")).toBe(false);
  });

  it("does not throw on a name that normalises to nothing", () => {
    expect(list.blocks("123")).toBe(false);
    expect(list.blocks("")).toBe(false);
  });
});

describe("normalizeTerm", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeTerm("Mo-na Lisa")).toBe("monalisa");
  });

  it("removes accents rather than dropping the letter under them", () => {
    expect(normalizeTerm("niño")).toBe("nino");
  });

  /* Leet substitution runs before the non-letter strip, or the digits it maps would
     already be gone. This is the test that pins that ordering. */
  it("maps leet digits to letters instead of deleting them", () => {
    expect(normalizeTerm("l33t")).toBe("leet");
    expect(normalizeTerm("h4x0r")).toBe("haxor");
  });

  /* The consequence of substituting before stripping, and it looks odd until you see
     why: "42!" is not thrown away, it becomes "aai", because a digit that stands in
     for a letter has to survive long enough to be one. Pinned because the two steps
     are order-dependent and swapping them would break every leet test above while
     leaving this one green. */
  it("substitutes digits and symbols rather than discarding them", () => {
    expect(normalizeTerm("Mo-na 42!")).toBe("monaai");
    expect(normalizeTerm("123")).toBe("ie");
  });

  /* Only characters with no letter to stand in for disappear entirely. */
  it("is empty for a string of characters that map to nothing", () => {
    expect(normalizeTerm("()[]{}")).toBe("");
    expect(normalizeTerm("   ")).toBe("");
  });
});
