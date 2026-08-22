import type { NavItem } from "@/models";
import { cx } from "@/utils/cx";

export type SectionNavProps = {
  items: NavItem[];
  className?: string;
};

/**
 * Replaces NavBar.
 *
 * The old component was a sticky glass bar across the top of every page, with an
 * IntersectionObserver driving an active marker. All of that is gone. This sits once,
 * inline, directly above the about section, and it is a jump menu: four anchors, set
 * flush with the left edge of the page's measure so the list starts where the prose
 * below it starts.
 *
 * Three things fell out of that, and each is worth more than what it replaced:
 *
 *   - No scroll-spy. An active marker only means anything on a control that stays in
 *     view, and this one scrolls away with the rest of the page.
 *   - No client boundary. With nothing pinned to the top of the viewport there is no
 *     offset to correct for, so a plain #hash anchor plus the reset's
 *     scroll-behavior:smooth does exactly what scrollToSection was doing in JS.
 *   - No wordmark. It sat one screen below the hero, which says the same name in
 *     display type down the left edge.
 *
 * The presence readout went with them — the pulsing dot and the screen-reader label
 * that stood in for it, dropped together on purpose. Keeping the label with nothing
 * visible beside it would announce a status to one set of visitors and hide it from
 * everyone else. SignatureLog still carries presence, where it is about a person
 * rather than about the page.
 *
 * Rendered only on the homepage, which is why the anchors are bare fragments. The
 * footer carries the cross-page copy of this list for /work and /work/[slug].
 */
export const SectionNav = ({ items, className }: SectionNavProps) => (
  <nav aria-label="Sections" className={cx("jk-nav", className)}>
    <ul className="jk-nav__list">
      {items.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`} className="jk-nav__link">
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);
