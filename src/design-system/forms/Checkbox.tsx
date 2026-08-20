"use client";

import type { ReactNode } from "react";

export interface CheckboxProps {
  label?: ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  label,
  checked = false,
  onChange,
  disabled = false,
  className,
}: CheckboxProps) {
  const classes = ["jk-checkbox", disabled ? "jk-checkbox--disabled" : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={classes}>
      <span
        role="checkbox"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        className="jk-checkbox__box"
        onClick={() => !disabled && onChange?.(!checked)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onChange?.(!checked);
          }
        }}
      >
        {checked ? "×" : ""}
      </span>
      {label}
    </label>
  );
}
