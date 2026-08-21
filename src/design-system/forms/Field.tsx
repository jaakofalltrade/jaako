import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

export type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  children?: ReactNode;
  className?: string;
};

export const Field = ({ label, hint, required = false, children, className }: FieldProps) => (
  <label className={cx("jk-field", className)}>
    <span className="jk-field__label">
      {label}
      {required ? <span className="jk-field__required"> *</span> : null}
    </span>
    {children}
    {hint ? <span className="jk-field__hint">{hint}</span> : null}
  </label>
);
