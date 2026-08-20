"use client";

import { Badge } from "../core/Badge";
import type { ExperienceItem } from "@/data/experience";

export function ExperienceEntry({ company, location, totalTenure, roles, bullets, stack, current }: ExperienceItem) {
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--space-4)",
        padding: "var(--space-6) 0",
        borderBottom: "var(--border-1) solid var(--steel-400)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-headline)",
              fontSize: "var(--text-lg)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              color: "var(--text-strong)",
            }}
          >
            {company}
          </h3>
          {current ? (
            <Badge tone="green" blink>
              active
            </Badge>
          ) : (
            <Badge tone="steel">archived</Badge>
          )}
        </div>
        <span
          style={{
            fontFamily: "var(--font-pixel-micro)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            letterSpacing: "var(--tracking-wide)",
            textAlign: "right",
          }}
        >
          {location}
          <br />
          {totalTenure}
        </span>
      </div>

      <div style={{ display: "grid", gap: "var(--space-2)" }}>
        {roles.map((r) => (
          <div
            key={r.title}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "var(--space-4)",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-md)",
            }}
          >
            <span style={{ color: "var(--text-body)" }}>{r.title}</span>
            <span
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-pixel-micro)",
                fontSize: "var(--text-xs)",
                whiteSpace: "nowrap",
              }}
            >
              {r.period}
            </span>
          </div>
        ))}
      </div>

      <ul style={{ margin: 0, paddingLeft: "1.1em", display: "grid", gap: "var(--space-2)" }}>
        {bullets.map((b) => (
          <li
            key={b}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-md)",
              lineHeight: "var(--leading-normal)",
              color: "var(--text-body)",
            }}
          >
            {b}
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
        {stack.map((s) => (
          <Badge key={s} tone="steel">
            {s}
          </Badge>
        ))}
      </div>
    </div>
  );
}
