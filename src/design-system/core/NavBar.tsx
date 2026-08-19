"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { type CSSProperties } from "react";
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
  style?: CSSProperties;
}

export function NavBar({ brand = "JAAKO", items, status = "ONLINE", style }: NavBarProps) {
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
    <nav
      style={{
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-between",
        gap: "var(--space-6)",
        background: "linear-gradient(180deg,rgba(30,32,25,.92) 0%,rgba(13,14,11,.96) 100%)",
        borderTop: "var(--border-1) solid rgba(255,255,255,.10)",
        borderBottom: "var(--border-2) solid var(--void)",
        boxShadow: "var(--shadow-hud)",
        backdropFilter: "var(--blur-glass)",
        WebkitBackdropFilter: "var(--blur-glass)",
        ...style,
      } as CSSProperties}
    >
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 var(--space-7)",
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-2xl)",
          color: "var(--text-strong)",
          textShadow: "var(--text-shadow-stamp)",
          borderRight: "var(--border-1) solid var(--steel-400)",
          textDecoration: "none",
        }}
      >
        {brand}
      </Link>
      <ul style={{ display: "flex", listStyle: "none", margin: 0, padding: 0, alignItems: "stretch" }}>
        {items.map((item) => {
          const on = isActive(item);
          return (
            <li key={item.href} style={{ display: "flex" }}>
              <Link
                href={item.href}
                onClick={(e) => handleClick(e, item)}
                style={{
                  background: on ? "rgba(122,184,0,.10)" : "transparent",
                  borderBottom: on ? "var(--border-2) solid var(--xgreen)" : "var(--border-2) solid transparent",
                  padding: "var(--space-5) var(--space-6)",
                  cursor: "pointer",
                  fontFamily: "var(--font-pixel)",
                  fontSize: "var(--text-2xs)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--tracking-caps)",
                  color: on ? "var(--xgreen-lit)" : "var(--text-muted)",
                  textShadow: on ? "var(--glow-green)" : "var(--text-shadow-hud)",
                  transition: "var(--transition-card)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                }}
              >
                <span style={{ opacity: on ? 0.9 : 0.35 }}>[</span>
                {item.label}
                <span style={{ opacity: on ? 0.9 : 0.35 }}>]</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "0 var(--space-7)",
          borderLeft: "var(--border-1) solid var(--steel-400)",
          fontFamily: "var(--font-pixel-micro)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "var(--tracking-caps)",
          color: "var(--text-muted)",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            background: "var(--xgreen)",
            boxShadow: "var(--glow-green)",
            animation: "jk-flicker 4s infinite",
          }}
        />
        {status}
      </span>
    </nav>
  );
}
