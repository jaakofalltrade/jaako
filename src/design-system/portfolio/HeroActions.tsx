"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
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
      <Link href="/#work" onClick={(event) => handleClick(event, "work")} className="jk-hero__link">
        <Button as="span" variant={ButtonVariant.Primary} size={ButtonSize.Lg}>
          see the work →
        </Button>
      </Link>
    </div>
  );
};
