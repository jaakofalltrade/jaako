import type { ReactNode } from "react";
import { Reveal } from "../core/Reveal";
import { NowPlayingDock } from "./NowPlayingDock";
import { SiteFooter } from "./SiteFooter";

/**
 * The frame.
 *
 * The navigation used to be here, as a sticky bar above everything. It is not a
 * frame-level object any more: SectionNav renders once, inline, above the about
 * section, and the footer carries the cross-page copy of the same list so /work and
 * /work/<slug> still have a way back.
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
