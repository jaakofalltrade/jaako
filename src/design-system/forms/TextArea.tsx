"use client";

import React, { type CSSProperties, type TextareaHTMLAttributes } from "react";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function TextArea({ rows = 5, invalid = false, style, ...rest }: TextAreaProps) {
  const [focus, setFocus] = React.useState(false);
  return (
    <textarea
      rows={rows}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        width: "100%",
        padding: "var(--space-3) var(--space-4)",
        resize: "vertical",
        borderRadius: 0,
        background: "var(--surface-field)",
        color: "var(--text-body)",
        border: `var(--border-1) solid ${invalid ? "var(--alert)" : "var(--steel-400)"}`,
        boxShadow: "var(--inset-well)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        lineHeight: "var(--leading-normal)",
        outline: focus ? "var(--border-2) solid var(--focus-ring)" : "none",
        ...style,
      } as CSSProperties}
      {...rest}
    />
  );
}
