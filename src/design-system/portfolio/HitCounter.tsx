import type { CSSProperties } from "react";

export interface HitCounterProps {
  count?: number;
  digits?: number;
  label?: string;
  style?: CSSProperties;
}

export function HitCounter({ count = 1985057, digits = 7, label = "visitors", style }: HitCounterProps) {
  const str = String(count).padStart(digits, "0").slice(-digits);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)", ...style }}>
      <span
        style={{
          display: "inline-flex",
          gap: 2,
          padding: 3,
          background: "var(--void)",
          border: "var(--border-1) solid var(--steel-400)",
          boxShadow: "var(--inset-well)",
        }}
      >
        {str.split("").map((d, i) => (
          <span
            key={i}
            style={{
              width: 14,
              height: 20,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(180deg,#1f2119 0%,#0d0e0b 100%)",
              color: "var(--xgreen-lit)",
              fontFamily: "var(--font-pixel-micro)",
              fontSize: "var(--text-sm)",
              textShadow: "var(--glow-green)",
            }}
          >
            {d}
          </span>
        ))}
      </span>
      <span
        style={{
          fontFamily: "var(--font-pixel-micro)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-caps)",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
