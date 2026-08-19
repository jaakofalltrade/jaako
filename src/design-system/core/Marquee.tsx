import type { CSSProperties, ReactNode } from "react";

export interface MarqueeProps {
  speed?: string;
  tone?: "void" | "hazard";
  style?: CSSProperties;
  children?: ReactNode;
}

export function Marquee({ speed = "var(--dur-marquee)", tone = "void", style, children }: MarqueeProps) {
  const skin =
    tone === "hazard"
      ? { background: "var(--hazard)", color: "var(--void)", border: "var(--void)" }
      : { background: "var(--void)", color: "var(--xgreen-lit)", border: "var(--steel-400)" };
  return (
    <div
      style={{
        overflow: "hidden",
        background: skin.background,
        color: skin.color,
        borderRadius: 0,
        border: `var(--border-1) solid ${skin.border}`,
        boxShadow: "var(--inset-well)",
        padding: "var(--space-2) 0",
        ...style,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          gap: "var(--space-9)",
          whiteSpace: "nowrap",
          animation: `jk-marquee ${speed} linear infinite`,
          fontFamily: "var(--font-pixel)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "var(--tracking-caps)",
          textTransform: "uppercase",
          textShadow: tone === "hazard" ? "none" : "var(--glow-green)",
        }}
      >
        <span style={{ display: "inline-flex", gap: "var(--space-9)" }}>{children}</span>
        <span style={{ display: "inline-flex", gap: "var(--space-9)" }} aria-hidden="true">
          {children}
        </span>
      </div>
    </div>
  );
}
