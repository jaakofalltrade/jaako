import { describe, expect, it } from "vitest";
import { clamp } from "./number";

describe("clamp", () => {
  it("leaves a value inside the range alone", () => {
    expect(clamp({ value: 0.5, min: 0, max: 1 })).toBe(0.5);
  });

  it("holds at the floor", () => {
    expect(clamp({ value: -3, min: 0, max: 1 })).toBe(0);
  });

  it("holds at the ceiling", () => {
    expect(clamp({ value: 140, min: 0, max: 100 })).toBe(100);
  });

  it("returns the bounds themselves unchanged", () => {
    expect(clamp({ value: 0, min: 0, max: 1 })).toBe(0);
    expect(clamp({ value: 1, min: 0, max: 1 })).toBe(1);
  });

  /* Math.min(Math.max(v, min), max) resolves an inverted range to `max`. Not a case
     any caller creates today; pinned so a future refactor cannot change it silently. */
  it("resolves an inverted range to the maximum", () => {
    expect(clamp({ value: 5, min: 10, max: 0 })).toBe(0);
  });
});
