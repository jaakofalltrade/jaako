"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { PresenceStatus } from "@/models";
import type { NavItem } from "@/models";
import { PRESENCE_LABEL } from "@/constants/ui";
import { cx } from "@/utils/cx";
import { scrollToSection } from "../scrollToSection";

export type NavBarProps = {
  brand?: string;
  items: NavItem[];
  status?: PresenceStatus;
  className?: string;
};

export const NavBar = ({
  brand = "JAAKO",
  items,
  status = PresenceStatus.Online,
  className,
}: NavBarProps) => {
  const pathname = usePathname();
  const [activeId, setActiveId] = React.useState(items[0]?.id);

  React.useEffect(() => {
    if (pathname !== "/") return;

    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    sections.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pathname, items]);

  /**
   * Off the homepage, only an item that declares its own route can be active —
   * which is how /projects/some-slug keeps PROJECTS lit without building a path
   * out of the item's id.
   */
  const isActive = (item: NavItem): boolean =>
    pathname === "/"
      ? activeId === item.id
      : item.route !== undefined && pathname.startsWith(item.route);

  const handleClick = (event: React.MouseEvent, item: NavItem) => {
    // Next's Link only updates the URL on a same-page hash change — it doesn't
    // scroll. Scroll manually when we're already on the page the section lives on.
    if (pathname !== "/") return;
    event.preventDefault();
    scrollToSection({ id: item.id });
    setActiveId(item.id);
  };

  return (
    <nav className={cx("jk-navbar", className)}>
      <div className="jk-navbar__inner">
        <Link href="/" className="jk-navbar__brand">
          {brand}
        </Link>
        <ul className="jk-navbar__list">
          {items.map((item) => (
            <li key={item.href} className="jk-navbar__item">
              <Link
                href={item.href}
                onClick={(event) => handleClick(event, item)}
                className="jk-navbar__link"
                aria-current={isActive(item) ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <span className="jk-navbar__status">
          <span aria-hidden="true" className="jk-navbar__led" />
          {PRESENCE_LABEL[status]}
        </span>
      </div>
    </nav>
  );
};
