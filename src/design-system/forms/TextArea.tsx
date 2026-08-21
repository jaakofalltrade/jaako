import type { TextareaHTMLAttributes } from "react";
import { cx } from "@/utils/cx";

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const TextArea = ({ rows = 5, invalid = false, className, ...rest }: TextAreaProps) => (
  <textarea
    rows={rows}
    className={cx("jk-textarea", className)}
    aria-invalid={invalid || undefined}
    {...rest}
  />
);
