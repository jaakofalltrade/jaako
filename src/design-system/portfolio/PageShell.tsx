import type { ReactNode } from "react";
import { NavBar, type NavItem } from "../core/NavBar";
import { SiteFooter } from "./SiteFooter";

const NAV_ITEMS: NavItem[] = [
  { label: "ABOUT", href: "/#about", id: "about" },
  { label: "EXPERIENCE", href: "/#experience", id: "experience" },
  { label: "PROJECTS", href: "/#projects", id: "projects" },
  { label: "CONTACT", href: "/#contact", id: "contact" },
];

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="jk-shell">
      <NavBar brand="JAAKO" items={NAV_ITEMS} status="ONLINE" />
      <div className="jk-shell__container">
        <span aria-hidden="true" className="jk-shell__seam jk-shell__seam--left" />
        <span aria-hidden="true" className="jk-shell__seam jk-shell__seam--right" />
        <div className="jk-shell__main">{children}</div>
        <SiteFooter />
      </div>
    </div>
  );
}
