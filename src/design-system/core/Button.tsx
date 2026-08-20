import type { ElementType, MouseEventHandler, ReactNode } from "react";

export type ButtonVariant = "hazard" | "blue" | "metal" | "hud" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
  onClick?: MouseEventHandler;
  [key: string]: unknown;
}

export function Button({
  variant = "hazard",
  size = "md",
  icon,
  disabled = false,
  fullWidth = false,
  as = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  const Tag = as as ElementType;
  const classes = [
    "jk-btn",
    `jk-btn--${size}`,
    `jk-btn--${variant}`,
    fullWidth ? "jk-btn--full" : null,
    disabled ? "jk-btn--disabled" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes} disabled={as === "button" ? disabled : undefined} {...rest}>
      {icon ? <span className="jk-btn__icon">{icon}</span> : null}
      {children}
    </Tag>
  );
}
