"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * The scroll choreography's single observer.
 *
 * Mounted once by PageShell. Rather than each animated component owning its own
 * IntersectionObserver, everything opts in with a class or data attribute and this
 * finds them — one observer for the whole page instead of one per element.
 *
 * Each element is unobserved the moment it fires. Reveals are a first-impression
 * effect; re-playing them on scroll-up is what makes scroll animation feel cheap.
 *
 * Two safety nets, because the failure mode here is the worst one available — every
 * revealed element starts at opacity 0, so anything that stops this from running makes
 * the page look blank rather than merely unanimated:
 *
 *   1. The hidden state is gated on html.jk-reveal-ready, which is added below. With
 *      no JavaScript at all the class never lands and nothing is ever hidden.
 *   2. If the observer has still not fired once by FAILSAFE_MS, everything is revealed
 *      outright. That covers environments where IntersectionObserver exists but never
 *      delivers — a page that is not compositing, some headless and embedded browsers,
 *      certain prerenderers. Checking that it fired *zero* times is what separates
 *      "the observer is broken" from "the observer works and the reader has not
 *      scrolled yet", so a working page keeps its choreography.
 */

const SELECTOR = "[data-reveal],.jk-rule--draw,.jk-mask,.jk-plate-reveal";

const IN = "is-in";

const READY = "jk-reveal-ready";

const FAILSAFE_MS = 1500;

export const Reveal = () => {
  // Re-runs on client navigation. Without this, anything rendered by a route the user
  // navigated to rather than loaded directly would never be observed.
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const nodes = Array.from(document.querySelectorAll(SELECTOR));

    const revealAll = () => nodes.forEach((node) => node.classList.add(IN));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      // Nothing should be hidden in the first place, so the gate is deliberately not
      // set here — the CSS bypass under prefers-reduced-motion handles the rest.
      revealAll();
      return;
    }

    root.classList.add(READY);
    if (nodes.length === 0) return;

    let fired = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          fired += 1;
          entry.target.classList.add(IN);
          observer.unobserve(entry.target);
        });
      },
      // The negative bottom margin holds the trigger until an element is properly in
      // frame, so things do not animate while still clipped by the fold.
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    nodes.forEach((node) => {
      if (!node.classList.contains(IN)) observer.observe(node);
    });

    const failsafe = window.setTimeout(() => {
      if (fired > 0) return;
      observer.disconnect();
      revealAll();
    }, FAILSAFE_MS);

    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
};
