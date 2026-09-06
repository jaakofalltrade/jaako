"use client";

import { pageWindow } from "@/utils/pagination";

/**
 * A pager. Previous, a windowed run of page numbers, next.
 *
 * IT SHIPS NO STYLING AT ALL, AND THAT IS WHAT MAKES IT REUSABLE HERE RATHER THAN JUST
 * SHARED. Every other component in this folder writes its own `jk-` classes, which is
 * correct for the portfolio and wrong for a bare lab app: /lab/slots and /lab/deepcuts
 * paint their own ground and own their own type, and pulling the site's cascade into
 * one of them is the thing their modules' headers specifically forbid. A pager that
 * brought a look with it could therefore only ever be used on half the site.
 *
 * So every class comes from the caller. The site can pass `jk-` classes; a lab app
 * passes its own CSS-module classes; neither has to reimplement the arithmetic, the
 * disabled states or the labelling.
 *
 * IT OWNS NO STATE EITHER. Controlled, like a form field: the caller holds the page
 * number and decides what changing it means - component state, a search param, a
 * fetch. That is what keeps this file free of any opinion about routing.
 *
 * The counting is in utils/pagination.ts, which is pure and pinned by tests. Nothing in
 * here does arithmetic beyond asking whether a button is at the end of the range.
 */

export type PaginationClassNames = {
  root?: string;
  /** Every button: the numbers and the two arrows. */
  button?: string;
  /** The gap marker standing in for a run of hidden pages. */
  gap?: string;
};

export type PaginationProps = {
  /** 1-based, because it is printed and a reader counts from one. */
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  /**
   * The accessible name of the nav landmark, e.g. "playlists".
   *
   * Required rather than defaulted to "Pagination": a page with two pagers needs them
   * told apart, and a default is how they both end up called the same thing.
   */
  label: string;
  previousLabel: string;
  nextLabel: string;
  /**
   * How one page button is named to a screen reader, with `{page}` and `{count}`
   * replaced. A template rather than a function, so a server component could in
   * principle pass it - and so the wording stays in the caller's copy file.
   */
  pageLabel: string;
  /** How many page numbers to keep either side of the current one. */
  span?: number;
  classNames?: PaginationClassNames;
};

export const Pagination = ({
  page,
  pageCount,
  onChange,
  label,
  previousLabel,
  nextLabel,
  pageLabel,
  span,
  classNames = {},
}: PaginationProps) => {
  /* One page is not a pager. Rendering prev and next with both disabled would be a
     control that exists only to say it cannot be used. */
  if (pageCount <= 1) return null;

  const slots = pageWindow({ page, pageCount, span });

  const named = (value: number) =>
    pageLabel.replace("{page}", String(value)).replace("{count}", String(pageCount));

  return (
    <nav className={classNames.root} aria-label={label}>
      <button
        type="button"
        className={classNames.button}
        onClick={() => onChange(page - 1)}
        /* Disabled rather than hidden. A control that disappears at the ends moves
           every button beside it, so the target under the pointer changes as you page. */
        disabled={page <= 1}
      >
        {previousLabel}
      </button>

      {slots.map((slot, index) =>
        slot === null ? (
          /* The gap is decorative: a reader is already told "page 4 of 9" by the
             current button, and hearing "ellipsis" twice adds nothing.
             Keyed by index because that is genuinely what distinguishes two gaps -
             they carry no value of their own, and the surrounding numbers do. */
          <span key={`gap-${index}`} className={classNames.gap} aria-hidden="true">
            &hellip;
          </span>
        ) : (
          <button
            key={slot}
            type="button"
            className={classNames.button}
            onClick={() => onChange(slot)}
            aria-label={named(slot)}
            /* aria-current rather than aria-pressed: this is the page you are on, not a
               toggle you have switched on. */
            aria-current={slot === page ? "page" : undefined}
            data-current={slot === page ? "" : undefined}
          >
            {slot}
          </button>
        )
      )}

      <button
        type="button"
        className={classNames.button}
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
      >
        {nextLabel}
      </button>
    </nav>
  );
};
