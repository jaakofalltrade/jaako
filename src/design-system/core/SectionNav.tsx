"use client";

import React from "react";
import type { NavItem } from "@/models";
import { cx } from "@/utils/cx";

export type SectionNavProps = {
  items: NavItem[];
  className?: string;
};

/** Added to the bar once it is actually pinned. Nothing else keys off it. */
const STUCK = "is-stuck";

/**
 * Replaces NavBar.
 *
 * The old component was a sticky glass bar across the top of every page, with a
 * wordmark, a presence dot and an IntersectionObserver driving an active marker. What
 * is here is a jump menu: four anchors, rendered once, inline, directly above the
 * about section, which then pins itself to the top edge and stays reachable for the
 * rest of the scroll.
 *
 * The bar spans the full width of <main> while its links stay on the page measure, so
 * the frosted sheet reads as an edge of the window rather than as a panel floating in
 * the middle of one. Until it pins there is no sheet at all: over the masthead the
 * four links sit directly on the photograph like everything else, and the glass
 * arrives only when there is content underneath it to separate from.
 *
 * That last part is the only reason this is a client component. "Is it pinned" is not
 * a question CSS can answer — :stuck does not exist, and scroll-driven animations are
 * not in every browser this has to work in — so a zero-height sentinel sits directly
 * above the bar and an observer watches it leave the top of the viewport. One
 * observer, one boolean, no scroll handler: nothing here runs per frame.
 *
 * Still gone, and staying gone:
 *
 *   - The scroll-spy. Pinning makes an active marker defensible again — the control
 *     stays in view now — but it wants a second observer over four sections and this
 *     is a menu, not a readout. If it ever comes back it belongs in this file.
 *   - The offset correction. A pinned bar does mean a #hash lands its heading
 *     underneath it, but that is what scroll-padding-top on the scrollport is for —
 *     see --nav-clear in layout/_nav.scss and the html rule in base/_reset.scss.
 *   - The wordmark. It sat one screen below the hero, which says the same name.
 *   - The presence readout — the pulsing dot and the screen-reader label that stood
 *     in for it, dropped together on purpose. Keeping the label with nothing visible
 *     beside it would announce a status to one set of visitors and hide it from
 *     everyone else. KnownAs still carries presence, where it is about a person
 *     rather than about the page.
 *
 * Rendered only on the homepage, which is why the anchors are bare fragments. The
 * footer carries the cross-page copy of this list for /work and /work/[slug].
 */
export const SectionNav = ({ items, className }: SectionNavProps) => {
  const sentinel = React.useRef<HTMLSpanElement>(null);
  const [stuck, setStuck] = React.useState(false);

  React.useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    // The sentinel is a zero-height marker at the bar's resting position, so it
    // leaves the viewport at exactly the scroll offset where the bar starts sticking.
    // Watching it rather than the bar itself is what makes this work at all: a sticky
    // element never stops intersecting, so an observer pointed at the bar would report
    // it visible forever.
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <span ref={sentinel} aria-hidden="true" className="jk-nav__sentinel" />
      <nav aria-label="Sections" className={cx("jk-nav", stuck && STUCK, className)}>
        <div className="jk-nav__inner">
          <ul className="jk-nav__list">
            {items.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="jk-nav__link">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
};
