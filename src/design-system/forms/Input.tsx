import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid = false, className, ...rest }: InputProps) {
  return (
    <input
      className={["jk-input", className].filter(Boolean).join(" ")}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}
