import type { CSSProperties, ReactNode } from "react";

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Field({ label, hint, required = false, children, style }: FieldProps) {
  return (
    <label style={{ display: "grid", gap: "var(--space-2)", ...style }}>
      <span
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "var(--tracking-caps)",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {label}
        {required ? <span style={{ color: "var(--hazard)" }}> *</span> : null}
      </span>
      {children}
      {hint ? (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--piss-400)" }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
