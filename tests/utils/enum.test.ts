import { describe, expect, it } from "vitest";
import { ContactReason, Env } from "@/models";
import { isEnumValue } from "@/utils/enum";

describe("isEnumValue", () => {
  const isReason = isEnumValue(ContactReason);

  it("accepts a member's value", () => {
    expect(isReason("FREELANCE")).toBe(true);
  });

  it("refuses a string that is not one", () => {
    expect(isReason("CONSULTING")).toBe(false);
  });

  /* The two inputs that made this exist. serverConfig reads process.env.ENV, where an
     unset variable is the empty string and a lowercased one is a near miss; both used
     to slip through an `as Env` cast and surface as a 500 on the first property read. */
  it("refuses the empty string", () => {
    expect(isEnumValue(Env)("")).toBe(false);
  });

  it("is case sensitive", () => {
    expect(isEnumValue(Env)("production")).toBe(false);
    expect(isEnumValue(Env)("PRODUCTION")).toBe(true);
  });

  /* Values, not keys. ContactReason.FullTime is the key; "FULL_TIME" is the value, and
     the value is what arrives in a JSON body. */
  it("checks values rather than member names", () => {
    expect(isReason("FullTime")).toBe(false);
    expect(isReason("FULL_TIME")).toBe(true);
  });

  it("narrows the type at the call site", () => {
    const value: string = "SAYING_HI";
    if (!isReason(value)) throw new Error("expected a reason");

    // No cast on this line: that is the whole point of the type predicate.
    const reason: ContactReason = value;
    expect(reason).toBe(ContactReason.SayingHi);
  });
});
