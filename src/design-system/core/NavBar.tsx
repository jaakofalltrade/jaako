"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { scrollToSection } from "../scrollToSection";

export interface NavItem {
  label: string;
  href: string;
  /** id of the on-page section this item scrolls to, for scroll-spy active state. */
  id: string;
}

export interface NavBarProps {
  brand?: string;
  items: NavItem[];
  status?: string;
  className?: string;
}

export function NavBar({ brand = "JAAKO", items, status = "ONLINE", className }: NavBarProps) {
  const pathname = usePathname();
  const [activeId, setActiveId] = React.useState(items[0]?.id);

  React.useEffect(() => {
    if (pathname !== "/") return;
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname, items]);

  function isActive(item: NavItem) {
    if (pathname !== "/") return pathname.startsWith("/" + item.id);
    return activeId === item.id;
  }

  function handleClick(e: React.MouseEvent, item: NavItem) {
    // Next's Link only updates the URL on a same-page hash change — it doesn't
    // scroll. Scroll manually when we're already on the page the section lives on.
    if (pathname !== "/") return;
    e.preventDefault();
    scrollToSection(item.id);
    setActiveId(item.id);
  }

  return (
    <nav className={["jk-navbar", className].filter(Boolean).join(" ")}>
      <div className="jk-navbar__inner">
        <Link href="/" className="jk-navbar__brand">
          {brand}
        </Link>
        <ul className="jk-navbar__list">
          {items.map((item) => (
            <li key={item.href} className="jk-navbar__item">
              <Link
                href={item.href}
                onClick={(e) => handleClick(e, item)}
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
          {status}
        </span>
      </div>
    </nav>
  );
}
