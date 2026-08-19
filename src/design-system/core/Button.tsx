"use client";

import React, { type CSSProperties, type ElementType, type ReactNode } from "react";

export type ButtonVariant = "hazard" | "blue" | "metal" | "hud" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  as?: ElementType;
  style?: CSSProperties;
  children?: ReactNode;
  onClick?: React.MouseEventHandler;
  [key: string]: unknown;
}

const base: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-3)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  borderRadius: 0,
  fontFamily: "var(--font-pixel)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
  transition: "var(--transition-card)",
};

const sizes: Record<ButtonSize, CSSProperties & { padding: string }> = {
  sm: { height: "var(--control-h-sm)", padding: "0 var(--space-5)", fontSize: "var(--text-2xs)" },
  md: { height: "var(--control-h-md)", padding: "0 var(--space-7)", fontSize: "var(--text-xs)" },
  lg: { height: "var(--control-h-lg)", padding: "0 var(--space-9)", fontSize: "var(--text-sm)" },
};

const variants: Record<ButtonVariant, CSSProperties> = {
  hazard: {
    background: "var(--xgreen)",
    color: "var(--void)",
    border: "var(--border-2) solid var(--void)",
    boxShadow: "var(--shadow-plate)",
    textShadow: "none",
  },
  blue: {
    background: "var(--psblue)",
    color: "#fff",
    border: "var(--border-2) solid var(--void)",
    boxShadow: "var(--shadow-plate)",
    textShadow: "var(--text-shadow-hud)",
  },
  metal: {
    background: "var(--panel-gradient)",
    color: "var(--text-body)",
    border: "var(--border-1) solid var(--steel-300)",
    boxShadow: "var(--bevel-metal), var(--shadow-plate)",
    textShadow: "var(--text-shadow-hud)",
  },
  hud: {
    background: "var(--glass-tint)",
    color: "var(--text-link)",
    border: "var(--border-1) solid var(--border-hairline)",
    backdropFilter: "var(--blur-glass)",
    WebkitBackdropFilter: "var(--blur-glass)",
    boxShadow: "var(--shadow-hud)",
    textShadow: "var(--text-shadow-hud)",
  } as CSSProperties,
  ghost: {
    background: "transparent",
    color: "var(--text-muted)",
    border: "var(--border-1) dashed var(--steel-300)",
  },
};

/** Diagonal hazard-stripe edge on the filled variants. */
function StripeEdge({ tone }: { tone: ButtonVariant }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        right: 0,
        width: 14,
        background:
          tone === "blue"
            ? "repeating-linear-gradient(45deg,var(--psblue-dim) 0 6px,var(--void) 6px 12px)"
            : "var(--hazard-stripes)",
        borderLeft: "var(--border-2) solid var(--void)",
        opacity: 0.95,
      }}
    />
  );
}

export function Button({
  variant = "hazard",
  size = "md",
  icon,
  disabled = false,
  fullWidth = false,
  as = "button",
  style,
  children,
  ...rest
}: ButtonProps) {
  const [state, setState] = React.useState<"idle" | "hover" | "press">("idle");
  const Tag = as as ElementType;
  const filled = variant === "hazard" || variant === "blue";
  const sizeStyle = sizes[size] || sizes.md;
  const s: CSSProperties = {
    ...base,
    ...sizeStyle,
    ...(variants[variant] || variants.hazard),
    paddingRight: filled
      ? `calc(${sizeStyle.padding.split(" ")[1]} + 18px)`
      : sizeStyle.padding.split(" ")[1],
    width: fullWidth ? "100%" : undefined,
    opacity: disabled ? 0.4 : 1,
    filter: !disabled && state !== "idle" ? "brightness(1.12)" : "none",
    transform: !disabled && state === "press" ? "translateY(1px)" : "none",
    ...(state === "hover" && !disabled
      ? { boxShadow: variant === "blue" ? "var(--glow-blue), var(--shadow-plate)" : "var(--glow-green), var(--shadow-plate)" }
      : null),
    ...(state === "press" && !disabled && variant === "metal"
      ? { background: "var(--panel-gradient-dark)", boxShadow: "var(--bevel-metal-active)" }
      : null),
    pointerEvents: disabled ? "none" : undefined,
    ...style,
  };
  return (
    <Tag
      style={s}
      disabled={as === "button" ? disabled : undefined}
      onMouseEnter={() => setState("hover")}
      onMouseLeave={() => setState("idle")}
      onMouseDown={() => setState("press")}
      onMouseUp={() => setState("hover")}
      {...rest}
    >
      {variant === "hud" ? <span style={{ opacity: 0.6 }}>[</span> : null}
      {icon ? <span style={{ display: "inline-flex", width: 14, height: 14 }}>{icon}</span> : null}
      {children}
      {variant === "hud" ? <span style={{ opacity: 0.6 }}>]</span> : null}
      {filled ? <StripeEdge tone={variant} /> : null}
    </Tag>
  );
}
