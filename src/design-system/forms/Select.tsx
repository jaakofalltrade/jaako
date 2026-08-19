"use client";

import React, { type CSSProperties, type SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: string[];
}

export function Select({ options, style, ...rest }: SelectProps) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{ position: "relative", ...style }}>
      <select
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: "100%",
          height: "var(--control-h-md)",
          padding: "0 var(--space-9) 0 var(--space-4)",
          appearance: "none",
          borderRadius: 0,
          background: "var(--panel-gradient)",
          color: "var(--text-body)",
          border: "var(--border-1) solid var(--steel-300)",
          boxShadow: "var(--bevel-metal)",
          fontFamily: "var(--font-pixel)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-wide)",
          outline: focus ? "var(--border-2) solid var(--focus-ring)" : "none",
        } as CSSProperties}
        {...rest}
      >
        {options.map((o) => (
          <option key={o} value={o} style={{ background: "var(--steel-600)" }}>
            {o}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 4,
          top: 4,
          width: 20,
          height: 22,
          display: "grid",
          placeItems: "center",
          background: "var(--void)",
          border: "var(--border-1) solid var(--steel-400)",
          color: "var(--xgreen-lit)",
          fontFamily: "var(--font-pixel-micro)",
          fontSize: "var(--text-3xs)",
          pointerEvents: "none",
        }}
      >
        ▼
      </span>
    </div>
  );
}
