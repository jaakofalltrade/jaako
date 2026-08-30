import { describe, expect, it } from "vitest";
import { NAME_LIMITS } from "@/constants";
import { SuggestFailure } from "@/models";
import { checkDisplayName, normalizeDisplayName } from "@/utils/nameRules";

/** Built rather than typed, so this file carries no bytes a reviewer cannot see. */
const CONTROL = String.fromCharCode(0, 1, 31);

describe("normalizeDisplayName", () => {
  it("trims", () => {
    expect(normalizeDisplayName("  mona  ")).toBe("mona");
  });

  /* The reason a name cannot spend nine of its ten characters on air. */
  it("collapses a run of spaces to one", () => {
    expect(normalizeDisplayName("a          b")).toBe("a b");
  });

  it("collapses control characters, and the space they become collapses too", () => {
    expect(normalizeDisplayName(`a${CONTROL}b`)).toBe("a b");
  });

  /* A name of nothing but invisible characters must not pass a non-empty check and
     then render as a blank signature on a public list. */
  it("is empty for a name that is nothing but control characters", () => {
    expect(normalizeDisplayName(CONTROL)).toBe("");
  });

  it("leaves an ordinary name alone", () => {
    expect(normalizeDisplayName("mona")).toBe("mona");
  });
});

describe("checkDisplayName", () => {
  it("passes a name inside the range", () => {
    expect(checkDisplayName("mona")).toBeNull();
  });

  it("requires something", () => {
    expect(checkDisplayName("")).toBe(SuggestFailure.NameRequired);
  });

  it("refuses one character short of the floor", () => {
    expect(checkDisplayName("m".repeat(NAME_LIMITS.min - 1))).toBe(SuggestFailure.NameTooShort);
  });

  it("accepts exactly the floor", () => {
    expect(checkDisplayName("m".repeat(NAME_LIMITS.min))).toBeNull();
  });

  it("accepts exactly the ceiling", () => {
    expect(checkDisplayName("m".repeat(NAME_LIMITS.max))).toBeNull();
  });

  it("refuses one character past the ceiling", () => {
    expect(checkDisplayName("m".repeat(NAME_LIMITS.max + 1))).toBe(SuggestFailure.NameTooLong);
  });

  /* The consequence of a ten-character cap, pinned so it stays a decision rather than
     a surprise: this is a real first name and it does not fit. */
  it("does not fit christopher", () => {
    expect(checkDisplayName("christopher")).toBe(SuggestFailure.NameTooLong);
  });

  /* Length is counted in UTF-16 code units, so a character outside the basic plane
     costs two and six of them overflow a ten-character field. That is the behaviour
     rather than an aspiration: if it ever needs to count graphemes, this is the test
     that changes. */
  it("counts an astral character as two", () => {
    const astral = String.fromCodePoint(0x1d50a); // one glyph, two code units
    expect(astral.length).toBe(2);
    expect(checkDisplayName(astral.repeat(5))).toBeNull();
    expect(checkDisplayName(astral.repeat(6))).toBe(SuggestFailure.NameTooLong);
  });

  /* Length only. The blocklist is a server-side control and deliberately not here;
     see the header of nameRules.ts. */
  it("says nothing about content", () => {
    expect(checkDisplayName("anything")).toBeNull();
  });
});
