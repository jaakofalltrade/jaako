import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { BUTTON_SIZE_CLASS, BUTTON_VARIANT_CLASS } from "@/constants/ui";
import { ButtonSize, ButtonVariant } from "@/models";
import { cx } from "@/utils/cx";

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * Polymorphic: whatever `as` is set to, the remaining props are that element's
 * own props and nothing else.
 *
 * This replaces an `[key: string]: unknown` index signature, which type-checked
 * absolutely anything — including dangerouslySetInnerHTML — onto an arbitrary tag.
 */
export type ButtonProps<T extends ElementType = "button"> = ButtonOwnProps & {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, keyof ButtonOwnProps | "as">;

export const Button = <T extends ElementType = "button">({
  as,
  variant = ButtonVariant.Hazard,
  size = ButtonSize.Md,
  icon,
  disabled = false,
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonProps<T>) => {
  const Tag = (as ?? "button") as ElementType;

  return (
    <Tag
      className={cx(
        "jk-btn",
        BUTTON_SIZE_CLASS[size],
        BUTTON_VARIANT_CLASS[variant],
        fullWidth && "jk-btn--full",
        disabled && "jk-btn--disabled",
        className,
      )}
      disabled={Tag === "button" ? disabled : undefined}
      {...rest}
    >
      {icon ? <span className="jk-btn__icon">{icon}</span> : null}
      {children}
    </Tag>
  );
};
