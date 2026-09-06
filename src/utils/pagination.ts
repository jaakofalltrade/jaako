/**
 * Which page numbers a pager should draw.
 *
 * Pure and dependency-free, so the component that renders the buttons has no
 * arithmetic in it at all and this can be pinned by a test. The interesting bugs in a
 * pager are all in here: the window sliding off the end, a gap marker standing in for a
 * single page, and the first and last buttons disappearing when the list is long.
 */

/**
 * A page number, or null for a gap the caller renders as an ellipsis.
 *
 * Null rather than a sentinel number or a string, because a gap is the ABSENCE of pages
 * and every other value in the list is a page somebody can click. A "…" string would
 * make the array (number | string)[] and push the same check into the render.
 */
export type PageSlot = number | null;

/**
 * The pages to show: the first, the last, and a window around the current one.
 *
 * Pages are 1-based, because they are printed and a reader counts from one.
 *
 * TWO RULES DECIDE EVERYTHING BELOW. The first and the last page are always reachable,
 * so a long list never hides its own ends. And a gap is only drawn where it actually
 * saves something: with one page missing, the ellipsis and the number it replaces take
 * the same room, so the number is drawn instead. Without that second rule a nine-page
 * list on page five renders "1 … 4 5 6 … 9", where each "…" is standing in for exactly
 * one page, and the reader is being hidden a 3 and a 7 for no gain.
 *
 * `span` is how many neighbours to keep either side of the current page. One is the
 * default because it makes a five-button run - first, previous, current, next, last -
 * which fits a narrow column.
 */
export const pageWindow = (args: {
  page: number;
  pageCount: number;
  span?: number;
}): PageSlot[] => {
  const { page, pageCount, span = 1 } = args;

  if (pageCount <= 0) return [];

  // A page outside the list is clamped rather than refused: it arrives from state a
  // caller owns, and a pager that renders nothing is a worse answer than one that
  // renders the nearest real page.
  const current = Math.min(Math.max(page, 1), pageCount);

  const from = Math.max(current - span, 1);
  const to = Math.min(current + span, pageCount);

  const slots: PageSlot[] = [];

  for (let value = 1; value <= pageCount; value += 1) {
    const inWindow = value >= from && value <= to;
    const isEnd = value === 1 || value === pageCount;

    if (inWindow || isEnd) {
      slots.push(value);
      continue;
    }

    // One gap marker per run of hidden pages, and never for a run of one — see above.
    const previous = slots[slots.length - 1];
    const isRunOfOne =
      (value === 2 && from === 3) || (value === pageCount - 1 && to === pageCount - 2);

    if (isRunOfOne) {
      slots.push(value);
      continue;
    }

    if (previous !== null) slots.push(null);
  }

  return slots;
};
