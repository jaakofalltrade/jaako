import type { ReactNode } from "react";
import { NavBar, type NavItem } from "../core/NavBar";
import { SiteFooter } from "./SiteFooter";

const NAV_ITEMS: NavItem[] = [
  { label: "ABOUT", href: "/#about", id: "about" },
  { label: "PROJECTS", href: "/#projects", id: "projects" },
  { label: "CONTACT", href: "/#contact", id: "contact" },
];

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)", backgroundAttachment: "fixed" }}>
      <NavBar brand="JAAKO" items={NAV_ITEMS} status="ONLINE" />
      <div style={{ position: "relative", margin: "0 auto", maxWidth: 1120, padding: "0 var(--space-8)" }}>
        <span
          aria-hidden="true"
          style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "var(--seam)" }}
        />
        <span
          aria-hidden="true"
          style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 2, background: "var(--seam)" }}
        />
        <div style={{ display: "grid", gap: "var(--space-8)", padding: "var(--space-9) 0" }}>{children}</div>
        <SiteFooter />
      </div>
    </div>
  );
}
