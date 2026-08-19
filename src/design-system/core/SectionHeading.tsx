import type { CSSProperties, ReactNode } from "react";

export interface SectionHeadingProps {
  children?: ReactNode;
  kicker?: ReactNode;
  rule?: boolean;
  tone?: "light" | "dim";
  style?: CSSProperties;
}

export function SectionHeading({ children, kicker, rule = true, tone = "light", style }: SectionHeadingProps) {
  return (
    <header style={{ display: "grid", gap: "var(--space-3)", ...style }}>
      {kicker ? (
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "var(--tracking-caps)",
            textTransform: "uppercase",
            color: "var(--xgreen-lit)",
            textShadow: "var(--glow-green)",
          }}
        >
          {kicker}
        </span>
      ) : null}
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-3xl)",
          lineHeight: "var(--leading-snug)",
          textTransform: "uppercase",
          color: tone === "dim" ? "var(--text-muted)" : "var(--text-strong)",
          textShadow: "var(--text-shadow-stamp)",
        }}
      >
        {children}
      </h2>
      {rule ? <span style={{ height: 6, background: "var(--hazard-stripes)", opacity: 0.85 }} /> : null}
    </header>
  );
}
