"use client";

import type { CSSProperties } from "react";

export interface RadioProps {
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  style?: CSSProperties;
}

export function Radio({ options, value, onChange, name = "radio", style }: RadioProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", ...style }}>
      {options.map((o) => {
        const on = o === value;
        return (
          <label
            key={o}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-3)",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              color: "var(--text-body)",
            }}
          >
            <input
              type="radio"
              name={name}
              checked={on}
              onChange={() => onChange && onChange(o)}
              style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
            />
            <span
              style={{
                width: 16,
                height: 16,
                display: "grid",
                placeItems: "center",
                background: "var(--surface-field)",
                border: "var(--border-1) solid var(--steel-400)",
                boxShadow: "var(--inset-well)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: on ? "var(--xgreen)" : "transparent",
                  boxShadow: on ? "var(--glow-green)" : "none",
                }}
              />
            </span>
            {o}
          </label>
        );
      })}
    </div>
  );
}
