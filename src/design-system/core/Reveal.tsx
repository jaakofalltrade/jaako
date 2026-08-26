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

/* .jk-decrypt is the fifth behaviour and the only one with no matching rule in
   components/_reveal.scss, which is correct rather than an omission: it has no hidden
   initial state to gate, because DecryptedText renders its real text until it is told
   to start. It is listed here so the settling readouts run off the page's one observer
   instead of mounting an IntersectionObserver each, which is the rule this whole file
   exists to enforce. The class is the entire contract — that component watches its own
   classList for the `is-in` below. */
const SELECTOR = "[data-reveal],.jk-rule--draw,.jk-mask,.jk-plate-reveal,.jk-decrypt";

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

    /* THE LAST LINE OF THE DOCUMENT CANNOT SATISFY THE RULE ABOVE, SO IT GETS ITS OWN.
     *
     * The negative bottom margin means an element has to clear the bottom 6% of the
     * viewport before it counts as in frame. Nothing in the final 6% of the *page* ever
     * can: scroll to the very end and it is still sitting in that strip, with no scroll
     * left to lift it out. On a 867px viewport that is a dead band about 52px tall, and
     * .jk-footer__bar lives in it — measured at 821-835 against a cutoff of 815.
     *
     * This went unnoticed because nothing in the footer bar opted into the choreography
     * until the plate spec started settling; the failsafe does not cover it either,
     * since that only fires when the observer has delivered *nothing* at all.
     *
     * So: when there is no scroll left, anything still waiting is as in frame as it is
     * ever going to be, and it is released. This cannot affect the timing of the other
     * elements — by the time it runs they have all long since fired and been
     * unobserved — and it leaves the tuned rootMargin alone, which is the whole point.
     * Reveals still happen once and only once.
     */
    const scroller = document.scrollingElement ?? document.documentElement;

    /* `max > SLACK` IS A PRECONDITION, NOT A ROUNDING ALLOWANCE.
     *
     * On a page with nothing to scroll, scrollHeight - clientHeight is 0, and then
     * "no scroll left" is trivially true from the first paint — so a single stray scroll
     * event, of the kind an in-page anchor produces, would release every remaining
     * reveal at once. Requiring the page to be scrollable at all closes that, and it
     * also implies scrollTop > 0 wherever this passes, which is the real condition: you
     * cannot be at the end of something you never started. A page too short to scroll
     * does not need this anyway, because it has no end that is not already on screen. */
    const SLACK = 2;

    const atEnd = () => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      return max > SLACK && max - scroller.scrollTop <= SLACK;
    };

    const releaseAtEnd = () => {
      if (!atEnd()) return;
      window.removeEventListener("scroll", releaseAtEnd);
      nodes.forEach((node) => {
        if (node.classList.contains(IN)) return;
        node.classList.add(IN);
        observer.unobserve(node);
      });
    };

    window.addEventListener("scroll", releaseAtEnd, { passive: true });

    const failsafe = window.setTimeout(() => {
      if (fired > 0) return;
      observer.disconnect();
      revealAll();
    }, FAILSAFE_MS);

    return () => {
      window.clearTimeout(failsafe);
      window.removeEventListener("scroll", releaseAtEnd);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
};
