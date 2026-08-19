"use client";

import React, { type CSSProperties, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid = false, style, ...rest }: InputProps) {
  const [focus, setFocus] = React.useState(false);
  return (
    <input
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        width: "100%",
        height: "var(--control-h-md)",
        padding: "0 var(--space-4)",
        borderRadius: 0,
        background: "var(--surface-field)",
        color: "var(--text-body)",
        border: `var(--border-1) solid ${invalid ? "var(--alert)" : "var(--steel-400)"}`,
        boxShadow: "var(--inset-well)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        outline: focus ? "var(--border-2) solid var(--focus-ring)" : "none",
        outlineOffset: 0,
        ...style,
      } as CSSProperties}
      {...rest}
    />
  );
}
