"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { Badge } from "../core/Badge";
import { Button } from "../core/Button";
import { GlassPanel } from "../core/GlassPanel";
import { scrollToSection } from "../scrollToSection";

export function Hero() {
  function handleClick(e: MouseEvent, id: string) {
    e.preventDefault();
    scrollToSection(id);
  }

  return (
    <GlassPanel hazardEdge className="jk-hero">
      <span aria-hidden="true" className="jk-hero__scanlines" />
      <div className="jk-hero__badges">
        <Badge tone="green">online</Badge>
        <Badge tone="void">est. 2026</Badge>
        <Badge tone="void">
          <s className="jk-hero__struck">for hire</s> employed
        </Badge>
      </div>
      <h1 className="jk-hero__title">JAAKO ANDES</h1>
      <p className="jk-hero__blurb">
        I think therefore I am. Full-stack odd jobs: Next.js, Django, Discord bots, and whatever else the week
        needs.
      </p>
      <div className="jk-hero__actions">
        <Link href="/#projects" onClick={(e) => handleClick(e, "projects")} className="jk-hero__link">
          <Button as="span" variant="hazard" size="lg">
            see projects
          </Button>
        </Link>
        <Link href="/#contact" onClick={(e) => handleClick(e, "contact")} className="jk-hero__link">
          <Button as="span" variant="hud" size="lg">
            <s className="jk-hero__struck">hire me</s> say hi
          </Button>
        </Link>
      </div>
    </GlassPanel>
  );
}
