import type { InputHTMLAttributes } from "react";
import { cx } from "@/utils/cx";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = ({ invalid = false, className, ...rest }: InputProps) => (
  <input className={cx("jk-input", className)} aria-invalid={invalid || undefined} {...rest} />
);
