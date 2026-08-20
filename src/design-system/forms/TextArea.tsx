import type { TextareaHTMLAttributes } from "react";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function TextArea({ rows = 5, invalid = false, className, ...rest }: TextAreaProps) {
  return (
    <textarea
      rows={rows}
      className={["jk-textarea", className].filter(Boolean).join(" ")}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}
