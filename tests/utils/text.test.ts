import { describe, expect, it } from "vitest";
import { dropSuffix } from "@/utils/text";

describe("dropSuffix", () => {
  it("removes the suffix", () => {
    expect(dropSuffix({ text: "jaako andes.", suffix: "andes." })).toBe("jaako ");
  });

  /* The behaviour the doc comment argues for: the old expression subtracted lengths
     unconditionally, so a suffix out of sync with its string silently cut the wrong
     number of characters. Returning the string whole is visible immediately. */
  it("returns the text unchanged when it does not end with the suffix", () => {
    expect(dropSuffix({ text: "jaako andes.", suffix: "peaks." })).toBe("jaako andes.");
  });

  /* The one input that would otherwise erase everything: slice(0, -0) is slice(0, 0). */
  it("returns the text unchanged for an empty suffix", () => {
    expect(dropSuffix({ text: "jaako andes.", suffix: "" })).toBe("jaako andes.");
  });

  it("returns the empty string when the suffix is the whole text", () => {
    expect(dropSuffix({ text: "andes.", suffix: "andes." })).toBe("");
  });

  /* endsWith is case sensitive, and so is this. A suffix that differs in case is a
     suffix that has drifted, which is the case above. */
  it("does not match on a different case", () => {
    expect(dropSuffix({ text: "jaako Andes.", suffix: "andes." })).toBe("jaako Andes.");
  });
});
