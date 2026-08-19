"use client";

import type { CSSProperties, ReactNode } from "react";

export interface CheckboxProps {
  label?: ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: CSSProperties;
}

export function Checkbox({ label, checked = false, onChange, disabled = false, style }: CheckboxProps) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-3)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-sm)",
        color: "var(--text-body)",
        ...style,
      }}
    >
      <span
        role="checkbox"
        aria-checked={checked}
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: 16,
          height: 16,
          display: "grid",
          placeItems: "center",
          background: "var(--surface-field)",
          border: "var(--border-1) solid var(--steel-400)",
          boxShadow: "var(--inset-well)",
          fontFamily: "var(--font-pixel-micro)",
          fontSize: "var(--text-2xs)",
          color: "var(--xgreen-lit)",
          lineHeight: 1,
          textShadow: checked ? "var(--glow-green)" : "none",
        }}
      >
        {checked ? "×" : ""}
      </span>
      {label}
    </label>
  );
}
