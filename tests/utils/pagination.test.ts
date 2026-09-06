import { describe, expect, it } from "vitest";
import { pageWindow } from "@/utils/pagination";

/**
 * The pager's arithmetic.
 *
 * All of it is here rather than in the component, which is what makes it testable at
 * all: Pagination.tsx renders whatever this returns and does no counting of its own.
 */

describe("pageWindow", () => {
  it("shows every page when they all fit", () => {
    expect(pageWindow({ page: 1, pageCount: 3 })).toEqual([1, 2, 3]);
  });

  it("is empty for no pages", () => {
    expect(pageWindow({ page: 1, pageCount: 0 })).toEqual([]);
  });

  it("is a single page for a single page", () => {
    expect(pageWindow({ page: 1, pageCount: 1 })).toEqual([1]);
  });

  /* The nine-page case /lab/deepcuts actually renders: 75 playlists, 9 to a page. */
  it("keeps both ends reachable from the middle of a long list", () => {
    expect(pageWindow({ page: 5, pageCount: 9 })).toEqual([1, null, 4, 5, 6, null, 9]);
  });

  it("needs no leading gap on the first page", () => {
    expect(pageWindow({ page: 1, pageCount: 9 })).toEqual([1, 2, null, 9]);
  });

  it("needs no trailing gap on the last page", () => {
    expect(pageWindow({ page: 9, pageCount: 9 })).toEqual([1, null, 8, 9]);
  });

  /* A GAP THAT HIDES ONE PAGE IS DRAWN AS THAT PAGE. On page 4 of 9 the window reaches
     3, so the only thing between it and page 1 is page 2 — and an ellipsis standing in
     for a single number takes the same room as the number. */
  it("draws the page rather than a gap when only one page is hidden", () => {
    expect(pageWindow({ page: 4, pageCount: 9 })).toEqual([1, 2, 3, 4, 5, null, 9]);
  });

  it("does the same at the other end", () => {
    expect(pageWindow({ page: 6, pageCount: 9 })).toEqual([1, null, 5, 6, 7, 8, 9]);
  });

  /* Span 2 from page 5 reaches back to 3, so the only page hidden at the front is 2 —
     a run of one, which the rule above draws rather than replaces with an ellipsis. */
  it("widens the window when asked", () => {
    expect(pageWindow({ page: 5, pageCount: 11, span: 2 })).toEqual([
      1, 2, 3, 4, 5, 6, 7, null, 11,
    ]);
  });

  it("still gaps at the front once the window has moved far enough", () => {
    expect(pageWindow({ page: 7, pageCount: 13, span: 2 })).toEqual([
      1, null, 5, 6, 7, 8, 9, null, 13,
    ]);
  });

  /* The page number comes from state the caller owns, so it can be out of range. The
     nearest real page is a better answer than an empty pager. */
  it("clamps a page above the count", () => {
    expect(pageWindow({ page: 99, pageCount: 5 })).toEqual([1, null, 4, 5]);
  });

  it("clamps a page below one", () => {
    expect(pageWindow({ page: 0, pageCount: 5 })).toEqual([1, 2, null, 5]);
  });

  /* Never two gap markers in a row, at any width. */
  it("never emits adjacent gaps", () => {
    for (let count = 1; count <= 30; count += 1) {
      for (let page = 1; page <= count; page += 1) {
        const slots = pageWindow({ page, pageCount: count });
        const adjacent = slots.some(
          (slot, index) => slot === null && slots[index + 1] === null
        );
        expect(adjacent, `page ${page} of ${count}`).toBe(false);
      }
    }
  });

  /* Always ascending, never a repeat: the list is a row of buttons and a reader reads
     it left to right. */
  it("stays in ascending order with no repeats", () => {
    for (let count = 1; count <= 30; count += 1) {
      for (let page = 1; page <= count; page += 1) {
        const numbers = pageWindow({ page, pageCount: count }).filter(
          (slot): slot is number => slot !== null
        );
        const sorted = [...numbers].sort((a, b) => a - b);
        expect(numbers, `page ${page} of ${count}`).toEqual(sorted);
        expect(new Set(numbers).size).toBe(numbers.length);
      }
    }
  });

  /* The first, the last and the current page are reachable from every position. */
  it("always includes the first, last and current page", () => {
    for (let count = 1; count <= 30; count += 1) {
      for (let page = 1; page <= count; page += 1) {
        const slots = pageWindow({ page, pageCount: count });
        expect(slots, `page ${page} of ${count}`).toContain(1);
        expect(slots).toContain(count);
        expect(slots).toContain(page);
      }
    }
  });
});
