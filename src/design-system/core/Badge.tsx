import type { CSSProperties, ReactNode } from "react";

export type BadgeTone = "green" | "blue" | "hazard" | "steel" | "void" | "alert";

export interface BadgeProps {
  tone?: BadgeTone;
  blink?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}

const tones: Record<BadgeTone, { background: string; color: string; border: string }> = {
  green: { background: "var(--xgreen)", color: "var(--void)", border: "var(--void)" },
  blue: { background: "var(--psblue)", color: "#fff", border: "var(--void)" },
  hazard: { background: "var(--hazard)", color: "var(--void)", border: "var(--void)" },
  steel: { background: "var(--steel-500)", color: "var(--text-body)", border: "var(--steel-300)" },
  void: { background: "var(--void)", color: "var(--xgreen-lit)", border: "var(--steel-400)" },
  alert: { background: "var(--alert)", color: "#fff", border: "var(--void)" },
};

export function Badge({ tone = "steel", blink = false, style, children }: BadgeProps) {
  const t = tones[tone] || tones.steel;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 18,
        padding: "0 var(--space-3)",
        background: t.background,
        color: t.color,
        borderRadius: 0,
        border: `var(--border-1) solid ${t.border}`,
        fontFamily: "var(--font-pixel-micro)",
        fontSize: "var(--text-2xs)",
        letterSpacing: "var(--tracking-wide)",
        textTransform: "uppercase",
        animation: blink ? "jk-blink 1s steps(1,end) infinite" : "none",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
