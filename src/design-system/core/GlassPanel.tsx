"use client";

import React, { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  specular?: boolean;
  tint?: number;
  hoverLift?: boolean;
  hazardEdge?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}

export function GlassPanel({
  specular = true,
  tint = 0.55,
  hoverLift = false,
  hazardEdge = false,
  style,
  children,
  ...rest
}: GlassPanelProps) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 0,
        background: `rgba(13,14,11,${tint})`,
        border: "var(--border-1) solid var(--border-hairline)",
        backdropFilter: "var(--blur-glass)",
        WebkitBackdropFilter: "var(--blur-glass)",
        boxShadow: specular ? "var(--shadow-float), var(--inset-specular)" : "var(--shadow-float)",
        color: "var(--text-body)",
        textShadow: "var(--text-shadow-hud)",
        transition: "var(--transition-card)",
        transform: hoverLift && hover ? "translateY(var(--hover-lift))" : "none",
        ...style,
      } as CSSProperties}
      {...rest}
    >
      {hazardEdge ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 6,
            background: "var(--hazard-stripes)",
          }}
        />
      ) : null}
      {children}
    </div>
  );
}
