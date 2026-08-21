"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { BadgeTone, ButtonSize, ButtonVariant } from "@/models";
import { Badge } from "../core/Badge";
import { Button } from "../core/Button";
import { GlassPanel } from "../core/GlassPanel";
import { scrollToSection } from "../scrollToSection";

export const Hero = () => {
  const handleClick = (event: MouseEvent, id: string) => {
    event.preventDefault();
    scrollToSection({ id });
  };

  return (
    <GlassPanel hazardEdge className="jk-hero">
      <span aria-hidden="true" className="jk-hero__scanlines" />
      <div className="jk-hero__badges">
        <Badge tone={BadgeTone.Green}>online</Badge>
        <Badge tone={BadgeTone.Void}>est. 2026</Badge>
        <Badge tone={BadgeTone.Void}>
          <s className="jk-hero__struck">for hire</s> employed
        </Badge>
      </div>
      <h1 className="jk-hero__title">JAAKO ANDES</h1>
      <p className="jk-hero__blurb">
        I think therefore I am. Full-stack odd jobs: Next.js, Django, Discord bots, and whatever else the week
        needs.
      </p>
      <div className="jk-hero__actions">
        <Link href="/#projects" onClick={(event) => handleClick(event, "projects")} className="jk-hero__link">
          <Button as="span" variant={ButtonVariant.Hazard} size={ButtonSize.Lg}>
            see projects
          </Button>
        </Link>
        <Link href="/#contact" onClick={(event) => handleClick(event, "contact")} className="jk-hero__link">
          <Button as="span" variant={ButtonVariant.Hud} size={ButtonSize.Lg}>
            <s className="jk-hero__struck">hire me</s> say hi
          </Button>
        </Link>
      </div>
    </GlassPanel>
  );
};
