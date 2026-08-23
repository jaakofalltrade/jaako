import type { ReactNode } from "react";
import { Reveal } from "../core/Reveal";
import { NowPlayingDock } from "./NowPlayingDock";
import { SiteFooter } from "./SiteFooter";

/**
 * The frame.
 *
 * The navigation is not here, and its being sticky again has not changed that.
 * SectionNav renders once, inline, above the about section, and pins itself from
 * there; the footer carries the cross-page copy of the same list so /work and
 * /work/<slug> still have a way back. The difference from the bar that used to live
 * in this file is that the masthead gets the viewport to itself before anything is
 * pinned over it, and /work has no bar at all.
 *
 * The page ground is not here either. It is two fixed pseudo-elements on <body> — a
 * blurred photograph and the frost over it — which keeps this a frame and not a
 * backdrop. See base/_reset.scss.
 *
 * Reveal is mounted here rather than per-section so the whole page shares one
 * IntersectionObserver.
 */
export const PageShell = ({ children }: { children: ReactNode }) => (
  <div className="jk-shell">
    <Reveal />
    <main className="jk-shell__main">{children}</main>
    <SiteFooter />
    <NowPlayingDock />
  </div>
);
