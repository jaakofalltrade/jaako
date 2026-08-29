"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { routes } from "@/client/endpoints";
import { ButtonSize, ButtonVariant } from "@/models";
import { Button } from "../core/Button";
import { scrollToSection } from "../scrollToSection";

/**
 * The hero's call to action. Singular now.
 *
 * The second button — the struck-through "hire me / say hi" — is gone. Contact is
 * still one item in the section index a screen below and a whole section of its own
 * at the bottom, so nothing became unreachable; what went was a second competing
 * primary next to the first, which is the thing the one-primary-per-screen rule
 * exists to prevent.
 *
 * Still split out of Hero so the lettering and the metadata stay server components:
 * this link is the only part of the masthead that needs a click handler.
 */
export const HeroActions = () => {
  const handleClick = (event: MouseEvent, id: string) => {
    event.preventDefault();
    scrollToSection({ id });
  };

  return (
    <div className="jk-hero__actions" data-reveal data-delay="3">
      <Link href={routes.section({ id: "work" })} onClick={(event) => handleClick(event, "work")} className="jk-hero__link">
        <Button as="span" variant={ButtonVariant.Primary} size={ButtonSize.Lg}>
          see the work
          {/* Its own element rather than the last character of the label, and that is a
              centring fix rather than a flourish. Two things were pulling it off. The
              arrow is in neither webfont — see the fallback note in app/layout.tsx — so
              as part of the text run it hangs off a baseline set by a face with
              different vertical metrics and sits low against the caps. And
              --tracking-anno puts .18em of letter-spacing AFTER the last glyph, which
              is dead width inside a centred flex box: it shifts the whole label left by
              half of it. As a flex item the arrow is centred as a box instead, and
              components/_button.scss takes the trailing tracking back off.

              aria-hidden because the label already reads on its own; an arrow announced
              as "rightwards arrow" is noise. */}
          <span aria-hidden="true" className="jk-btn__arrow">
            →
          </span>
        </Button>
      </Link>
    </div>
  );
};
