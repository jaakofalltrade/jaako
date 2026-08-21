"use client";

import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

export type CheckboxProps = {
  label?: ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export const Checkbox = ({
  label,
  checked = false,
  onChange,
  disabled = false,
  className,
}: CheckboxProps) => (
  <label className={cx("jk-checkbox", disabled && "jk-checkbox--disabled", className)}>
    <span
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      className="jk-checkbox__box"
      onClick={() => !disabled && onChange?.(!checked)}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          onChange?.(!checked);
        }
      }}
    >
      {checked ? "×" : ""}
    </span>
    {label}
  </label>
);
