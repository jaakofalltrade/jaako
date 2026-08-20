import type { CSSProperties, ReactNode } from "react";

export interface MarqueeProps {
  /** Scroll duration, e.g. "18s". Continuous, so it rides in as a custom property. */
  speed?: string;
  tone?: "void" | "hazard";
  className?: string;
  children?: ReactNode;
}

export function Marquee({ speed, tone = "void", className, children }: MarqueeProps) {
  const classes = ["jk-marquee", `jk-marquee--${tone}`, className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <div
        className="jk-marquee__track"
        style={speed === undefined ? undefined : ({ "--marquee-dur": speed } as CSSProperties)}
      >
        <span className="jk-marquee__group">{children}</span>
        <span className="jk-marquee__group" aria-hidden="true">
          {children}
        </span>
      </div>
    </div>
  );
}
