import { describe, expect, it } from "vitest";
import { FIELD_LIMITS } from "@/constants";
import { ValidationFailure } from "@/models";
import { checkEmail, checkMessage, checkName, normalizeName } from "@/utils/contactRules";

/**
 * Control characters are built rather than typed, so this file stays free of bytes an
 * editor renders as nothing and a reviewer cannot see. NUL, SOH and US are three
 * points spread across the range the rule collapses.
 */
const CONTROL = String.fromCharCode(0, 1, 31);
const CRLF = String.fromCharCode(13, 10);

describe("normalizeName", () => {
  it("trims", () => {
    expect(normalizeName("  mona  ")).toBe("mona");
  });

  /* The bug this file was created to close: the route collapsed control characters and
     the browser did not, so a name of nothing but control characters passed in the
     browser and came back a 400 the sender could not have predicted. */
  it("collapses a run of control characters to a single space", () => {
    expect(normalizeName(`a${CONTROL}b`)).toBe("a b");
  });

  it("is empty for a name that is nothing but control characters", () => {
    expect(normalizeName(CONTROL)).toBe("");
  });

  /* name is the one field that reaches a mail header, and a header is line delimited.
     A value carrying CRLF is how somebody appends a header of their own, a Bcc being
     the obvious one. */
  it("flattens CRLF so a header cannot be injected", () => {
    expect(normalizeName(`mona${CRLF}Bcc: someone@example.test`)).toBe(
      "mona Bcc: someone@example.test"
    );
  });

  it("leaves an ordinary name alone", () => {
    expect(normalizeName("Mona Lisa-Smith")).toBe("Mona Lisa-Smith");
  });
});

describe("checkName", () => {
  it("passes a normal name", () => {
    expect(checkName("mona")).toBeNull();
  });

  it("requires something", () => {
    expect(checkName("")).toBe(ValidationFailure.NameRequired);
  });

  it("accepts exactly the limit and refuses one past it", () => {
    expect(checkName("m".repeat(FIELD_LIMITS.name))).toBeNull();
    expect(checkName("m".repeat(FIELD_LIMITS.name + 1))).toBe(ValidationFailure.NameTooLong);
  });
});

describe("checkEmail", () => {
  it("passes an ordinary address", () => {
    expect(checkEmail("someone@example.test")).toBeNull();
  });

  it("requires something", () => {
    expect(checkEmail("")).toBe(ValidationFailure.EmailRequired);
  });

  it("refuses an address with no domain", () => {
    expect(checkEmail("someone@")).toBe(ValidationFailure.EmailInvalid);
  });

  it("refuses an address with whitespace in it", () => {
    expect(checkEmail("some one@example.test")).toBe(ValidationFailure.EmailInvalid);
  });

  /* Length and shape collapse to one failure on purpose: a 200-character string that
     is also not an address is not two problems to the person who typed it, and
     EmailInvalid is the sentence that helps in both cases. */
  it("reports a too-long address as invalid rather than as too long", () => {
    const long = `${"m".repeat(FIELD_LIMITS.email)}@example.test`;
    expect(checkEmail(long)).toBe(ValidationFailure.EmailInvalid);
  });
});

describe("checkMessage", () => {
  it("passes a normal message", () => {
    expect(checkMessage("hello")).toBeNull();
  });

  it("requires something", () => {
    expect(checkMessage("")).toBe(ValidationFailure.MessageRequired);
  });

  it("accepts exactly the limit and refuses one past it", () => {
    expect(checkMessage("m".repeat(FIELD_LIMITS.message))).toBeNull();
    expect(checkMessage("m".repeat(FIELD_LIMITS.message + 1))).toBe(
      ValidationFailure.MessageTooLong
    );
  });

  /* Newlines are the sender's paragraphs, so unlike name this field is not flattened
     and a multi-paragraph message is not a validation failure. */
  it("accepts newlines", () => {
    expect(checkMessage("one\n\ntwo")).toBeNull();
  });
});
