"use client";

import { cx } from "@/utils/cx";

/** Value is the identifier that travels; label is what the visitor reads. */
export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
};

export type RadioProps<T extends string> = {
  options: readonly ChoiceOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  name?: string;
  className?: string;
};

export const Radio = <T extends string>({
  options,
  value,
  onChange,
  name = "radio",
  className,
}: RadioProps<T>) => (
  <div className={cx("jk-radio", className)}>
    {options.map((option) => (
      <label key={option.value} className="jk-radio__option">
        <input
          type="radio"
          name={name}
          value={option.value}
          checked={option.value === value}
          onChange={() => onChange?.(option.value)}
          className="jk-radio__input"
        />
        <span className="jk-radio__box">
          <span className="jk-radio__dot" />
        </span>
        {option.label}
      </label>
    ))}
  </div>
);
