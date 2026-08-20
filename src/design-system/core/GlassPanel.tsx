import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  specular?: boolean;
  /** Alpha of the smoked-glass tint. Continuous, so it rides in as a custom property. */
  tint?: number;
  hoverLift?: boolean;
  hazardEdge?: boolean;
  className?: string;
  children?: ReactNode;
}

export function GlassPanel({
  specular = true,
  tint,
  hoverLift = false,
  hazardEdge = false,
  className,
  children,
  ...rest
}: GlassPanelProps) {
  const classes = [
    "jk-glass",
    specular ? "jk-glass--specular" : null,
    hoverLift ? "jk-glass--hover-lift" : null,
    hazardEdge ? "jk-glass--hazard-edge" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={tint === undefined ? undefined : ({ "--glass-alpha": tint } as CSSProperties)}
      {...rest}
    >
      {children}
    </div>
  );
}
