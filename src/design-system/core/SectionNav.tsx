import { PresenceStatus } from "@/models";
import type { NavItem } from "@/models";
import { PRESENCE_CLASS, PRESENCE_LABEL } from "@/constants/ui";
import { cx } from "@/utils/cx";

export type SectionNavProps = {
  items: NavItem[];
  status?: PresenceStatus;
  className?: string;
};

/**
 * Replaces NavBar.
 *
 * The old component was a sticky glass bar across the top of every page, with an
 * IntersectionObserver driving an active marker. All of that is gone. This sits once,
 * inline, directly above the about section, and it is a jump menu: four anchors and a
 * presence readout.
 *
 * Three things fell out of that, and each is worth more than what it replaced:
 *
 *   - No scroll-spy. An active marker only means anything on a control that stays in
 *     view, and this one scrolls away with the rest of the page.
 *   - No client boundary. With nothing pinned to the top of the viewport there is no
 *     offset to correct for, so a plain #hash anchor plus the reset's
 *     scroll-behavior:smooth does exactly what scrollToSection was doing in JS.
 *   - No wordmark. It sat one screen below the hero, which says the same name in
 *     display type at 5.5rem.
 *
 * Rendered only on the homepage, which is why the anchors are bare fragments. The
 * footer carries the cross-page copy of this list for /work and /work/[slug].
 */
export const SectionNav = ({ items, status = PresenceStatus.Online, className }: SectionNavProps) => (
  <nav aria-label="Sections" className={cx("jk-nav", className)}>
    <span aria-hidden="true" className={cx("jk-nav__led", PRESENCE_CLASS[status])} />
    {/* The word came out; the dot stays. A bare dot means nothing on its own, so the
        label it used to sit beside is now announced instead of shown. */}
    <span className="jk-sr-only">{PRESENCE_LABEL[status]}</span>
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
