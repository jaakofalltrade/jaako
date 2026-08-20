import type { ReactNode } from "react";

export type BadgeTone = "green" | "blue" | "hazard" | "steel" | "void" | "alert";

export interface BadgeProps {
  tone?: BadgeTone;
  blink?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Badge({ tone = "steel", blink = false, className, children }: BadgeProps) {
  const classes = ["jk-badge", `jk-badge--${tone}`, blink ? "jk-badge--blink" : null, className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
