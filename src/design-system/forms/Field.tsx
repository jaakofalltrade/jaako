import type { ReactNode } from "react";

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  children?: ReactNode;
  className?: string;
}

export function Field({ label, hint, required = false, children, className }: FieldProps) {
  return (
    <label className={["jk-field", className].filter(Boolean).join(" ")}>
      <span className="jk-field__label">
        {label}
        {required ? <span className="jk-field__required"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="jk-field__hint">{hint}</span> : null}
    </label>
  );
}
