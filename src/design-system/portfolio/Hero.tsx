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
    <GlassPanel hazardEdge style={{ padding: "var(--space-10) var(--space-8) var(--space-9)" }}>
      <span
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: "var(--scanlines)", opacity: 0.4, pointerEvents: "none" }}
      />
      <div style={{ position: "relative", display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
        <Badge tone="green">online</Badge>
        <Badge tone="void">est. 2026</Badge>
      </div>
      <h1
        style={{
          position: "relative",
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-5xl)",
          lineHeight: "var(--leading-tight)",
          textTransform: "uppercase",
          color: "var(--text-strong)",
          textShadow: "4px 4px 0 rgba(0,0,0,.7)",
        }}
      >
        JAAKO ANDES
      </h1>
      <p
        style={{
          position: "relative",
          margin: "var(--space-5) 0 var(--space-7)",
          maxWidth: "48ch",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-md)",
          lineHeight: "var(--leading-normal)",
          color: "var(--text-body)",
        }}
      >
        I think therefore I am. Full-stack odd jobs — Next.js, Django, Discord bots, and whatever else the week
        needs.
      </p>
      <div style={{ position: "relative", display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <Link href="/#projects" onClick={(e) => handleClick(e, "projects")} style={{ textDecoration: "none" }}>
          <Button as="span" variant="hazard" size="lg">
            see projects
          </Button>
        </Link>
        <Link href="/#contact" onClick={(e) => handleClick(e, "contact")} style={{ textDecoration: "none" }}>
          <Button as="span" variant="hud" size="lg">
            hire me
          </Button>
        </Link>
      </div>
    </GlassPanel>
  );
}
