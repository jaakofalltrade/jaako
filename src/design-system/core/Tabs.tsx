"use client";

import { useId, useRef } from "react";
import type { ReactNode } from "react";

/**
 * A tab strip and the panel under it.
 *
 * SHIPS NO STYLING, LIKE Pagination BESIDE IT, and for the same reason: every other
 * component in this folder writes its own `jk-` classes, which is correct for the
 * portfolio and forbidden inside a bare lab app. Every class here comes from the caller,
 * so the site and /lab/deepcuts can share the behaviour without sharing a look.
 *
 * CONTROLLED. The caller owns which tab is open, so the same component works with
 * component state, a search param, or anything else.
 *
 * The keyboard handling is the part worth having a component for. Arrow keys move
 * between tabs, Home and End jump to the ends, and only the selected tab is in the tab
 * order - which is what the pattern requires and what nobody remembers to implement
 * when they write a tab strip by hand for the third time.
 */

export type TabItem = {
  /** Stable, and used in the DOM ids that tie a tab to its panel. */
  id: string;
  label: string;
  panel: ReactNode;
};

export type TabsClassNames = {
  root?: string;
  list?: string;
  tab?: string;
  panel?: string;
};

export type TabsProps = {
  items: TabItem[];
  /** The open tab's id. */
  value: string;
  onChange: (id: string) => void;
  /** Accessible name for the tab list, e.g. "how deepcuts works". */
  label: string;
  classNames?: TabsClassNames;
};

export const Tabs = ({ items, value, onChange, label, classNames = {} }: TabsProps) => {
  /* Ids have to be stable across server and client render, and unique if this is ever
     used twice on one page. useId is React's answer to exactly that. */
  const base = useId();
  const listRef = useRef<HTMLDivElement>(null);

  /* Falls back to the first tab rather than rendering no panel. `value` comes from state
     the caller owns and can point at a tab that has been removed. */
  const openIndex = Math.max(
    items.findIndex((item) => item.id === value),
    0
  );
  const open = items[openIndex];

  const tabId = (id: string) => `${base}-tab-${id}`;
  const panelId = (id: string) => `${base}-panel-${id}`;

  /**
   * Arrow keys move between tabs; Home and End jump to the ends.
   *
   * The move also focuses the tab it lands on, which is the half that is usually
   * missed: without it the selection moves and the focus ring stays behind, so a second
   * arrow press starts from wherever it was rather than from what is selected.
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const last = items.length - 1;

    const next = {
      ArrowRight: openIndex === last ? 0 : openIndex + 1,
      ArrowLeft: openIndex === 0 ? last : openIndex - 1,
      Home: 0,
      End: last,
    }[event.key];

    if (next === undefined) return;

    event.preventDefault();
    onChange(items[next].id);

    listRef.current
      ?.querySelectorAll<HTMLButtonElement>("[role='tab']")
      [next]?.focus();
  };

  return (
    <div className={classNames.root}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        className={classNames.list}
        onKeyDown={onKeyDown}
      >
        {items.map((item) => {
          const selected = item.id === open?.id;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={tabId(item.id)}
              aria-selected={selected}
              aria-controls={panelId(item.id)}
              /* ONE STOP FOR THE WHOLE STRIP. Tab enters at the selected tab and leaves
                 for the panel; the arrows move within. A strip where every tab is
                 tabbable makes a reader press Tab five times to get past a legend. */
              tabIndex={selected ? 0 : -1}
              className={classNames.tab}
              data-selected={selected ? "" : undefined}
              onClick={() => onChange(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ONLY THE OPEN PANEL IS RENDERED, rather than all of them with the closed ones
          hidden. These panels are static copy, so there is no state in a closed one to
          preserve, and not rendering it keeps it out of the accessibility tree and out
          of a find-in-page. */}
      {open ? (
        <div
          role="tabpanel"
          id={panelId(open.id)}
          aria-labelledby={tabId(open.id)}
          className={classNames.panel}
          /* Focusable, because the panel is what Tab reaches after the strip and a
             reader needs somewhere to land to read it. */
          tabIndex={0}
        >
          {open.panel}
        </div>
      ) : null}
    </div>
  );
};
