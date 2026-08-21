import type { SelectHTMLAttributes } from "react";
import { cx } from "@/utils/cx";
import type { ChoiceOption } from "./Radio";

export type SelectProps<T extends string> = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
> & {
  options: readonly ChoiceOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  wrapperClassName?: string;
};

export const Select = <T extends string>({
  options,
  value,
  onChange,
  className,
  wrapperClassName,
  ...rest
}: SelectProps<T>) => (
  <div className={cx("jk-select", wrapperClassName)}>
    <select
      className={cx("jk-select__control", className)}
      value={value}
      onChange={(event) => onChange?.(event.target.value as T)}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="jk-select__option">
          {option.label}
        </option>
      ))}
    </select>
    <span aria-hidden="true" className="jk-select__chevron">
      ▼
    </span>
  </div>
);
