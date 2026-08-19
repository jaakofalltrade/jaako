"use client";

import React, { type CSSProperties } from "react";
import { Window } from "../core/Window";
import { Badge } from "../core/Badge";

export interface ProjectCardProps {
  title: string;
  blurb: string;
  stack?: string[];
  year: string;
  status: string;
  thumb?: string;
  style?: CSSProperties;
}

export function ProjectCard({ title, blurb, stack = [], year, status, thumb, style }: ProjectCardProps) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        transition: "var(--transition-card)",
        transform: hover ? "translateY(var(--hover-lift))" : "none",
        filter: hover ? "brightness(1.08)" : "none",
        cursor: "pointer",
        ...style,
      }}
    >
      <Window
        title={title.toLowerCase().replace(/\s+/g, "_")}
        footer={
          <span>
            {year} · {status}
          </span>
        }
        padded={false}
        rivets={false}
      >
        {thumb ? (
          <div
            style={{
              height: 108,
              position: "relative",
              overflow: "hidden",
              background: `center/cover no-repeat url(${thumb})`,
              borderBottom: "var(--border-1) solid var(--steel-400)",
            }}
          >
            <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "var(--scanlines)", opacity: 0.5 }} />
          </div>
        ) : null}
        <span
          aria-hidden="true"
          style={{
            display: "block",
            height: 4,
            background: hover ? "var(--hazard-stripes-green)" : "transparent",
            transition: "var(--transition-card)",
          }}
        />
        <div style={{ padding: "var(--space-6)", display: "grid", gap: "var(--space-4)" }}>
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-headline)",
              fontSize: "var(--text-2xl)",
              lineHeight: "var(--leading-tight)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              color: "var(--text-strong)",
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              lineHeight: "var(--leading-normal)",
              color: "var(--text-body)",
            }}
          >
            {blurb}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {stack.map((s) => (
              <Badge key={s} tone="steel">
                {s}
              </Badge>
            ))}
          </div>
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-2xs)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              color: hover ? "var(--text-link-hover)" : "var(--text-link)",
            }}
          >
            [ open → ]
          </span>
        </div>
      </Window>
    </div>
  );
}
