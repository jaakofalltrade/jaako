import type { ReactNode } from "react";
import { PresenceStatus } from "@/models";
import type { NavItem } from "@/models";
import { NavBar } from "../core/NavBar";
import { SiteFooter } from "./SiteFooter";

const NAV_ITEMS: NavItem[] = [
  { label: "ABOUT", href: "/#about", id: "about" },
  { label: "EXPERIENCE", href: "/#experience", id: "experience" },
  // Also lit on /projects/<slug>, which is why it carries a route.
  { label: "PROJECTS", href: "/#projects", id: "projects", route: "/projects" },
  { label: "CONTACT", href: "/#contact", id: "contact" },
];

export const PageShell = ({ children }: { children: ReactNode }) => (
  <div className="jk-shell">
    <NavBar brand="JAAKO" items={NAV_ITEMS} status={PresenceStatus.Online} />
    <div className="jk-shell__container">
      <span aria-hidden="true" className="jk-shell__seam jk-shell__seam--left" />
      <span aria-hidden="true" className="jk-shell__seam jk-shell__seam--right" />
      <div className="jk-shell__main">{children}</div>
      <SiteFooter />
    </div>
  </div>
);
