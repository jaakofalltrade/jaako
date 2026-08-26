import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

export type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  /** The failure for this one field. Replaces the hint while it is set. */
  error?: string;
  /** Ties the message to the control for assistive tech. Required when error is used. */
  errorId?: string;
  children?: ReactNode;
  className?: string;
};

/**
 * Label / control / message wrapper.
 *
 * The error replaces the hint rather than stacking under it. Both occupy the same slot
 * under the control and say something about what to type; showing "i reply within a
 * week, probably" directly above "E-mail is required." reads as two voices talking
 * over each other, and the one that matters is the one that just went wrong.
 *
 * role="alert" so the message is announced when it appears. The id is the caller's to
 * supply because it is the control that has to point at it with aria-describedby, and
 * the control is a child here.
 */
export const Field = ({
  label,
  hint,
  required = false,
  error,
  errorId,
  children,
  className,
}: FieldProps) => (
  <label className={cx("jk-field", className)}>
    <span className="jk-field__label">
      {label}
      {required ? <span className="jk-field__required"> *</span> : null}
    </span>
    {children}
    {error ? (
      <span id={errorId} role="alert" className="jk-field__error">
        {error}
      </span>
    ) : hint ? (
      <span className="jk-field__hint">{hint}</span>
    ) : null}
  </label>
);
