import { describe, expect, it } from "vitest";
import { cx } from "./cx";

describe("cx", () => {
  it("joins the truthy ones with a single space", () => {
    expect(cx("a", "b", "c")).toBe("a b c");
  });

  it("drops every flavour of falsy", () => {
    expect(cx("a", false, null, undefined, "b")).toBe("a b");
  });

  /* The empty string is falsy, so a component passing a className that happens to be
     empty must not produce a leading or doubled space. */
  it("drops the empty string rather than leaving a gap", () => {
    expect(cx("", "a", "")).toBe("a");
  });

  it("is the empty string when nothing survives", () => {
    expect(cx(false, null, undefined)).toBe("");
  });
});
