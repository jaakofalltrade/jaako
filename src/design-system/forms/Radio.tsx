"use client";

import { cx } from "@/utils/cx";

/** Value is the identifier that travels; label is what the visitor reads. */
export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  /**
   * An option that is on the list but not on offer — struck through and unpickable.
   *
   * It exists because "not available" is information and removing the option destroys
   * it: a reason list of one says nothing, while a list with two of its three entries
   * crossed out says exactly what is going on. The same device as the struck copy in
   * the masthead and the footer ticker, applied to a control.
   */
  disabled?: boolean;
};

export type RadioProps<T extends string> = {
  options: readonly ChoiceOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  name?: string;
  /**
   * Lay the options out in a wrapping row instead of a column.
   *
   * For short labels where a stack is mostly whitespace — three one-word reasons cost
   * three full touch-height rows stacked, and one row inline.
   */
  inline?: boolean;
  className?: string;
};

export const Radio = <T extends string>({
  options,
  value,
  onChange,
  name = "radio",
  inline = false,
  className,
}: RadioProps<T>) => (
  <div className={cx("jk-radio", inline && "jk-radio--inline", className)}>
    {options.map((option) => (
      <label
        key={option.value}
        className={cx("jk-radio__option", option.disabled && "is-disabled")}
      >
        {/*
          `disabled`, not `aria-disabled`. The distinction matters and the stricter one
          is right here: aria-disabled announces the state but leaves the control
          focusable and operable, which is what you want when the option might become
          available after some other change on the form. These cannot become available
          by anything the visitor does, so the real attribute is honest — it takes them
          out of the tab order and refuses the click, and the strike says why.
        */}
        <input
          type="radio"
          name={name}
          value={option.value}
          checked={option.value === value}
          disabled={option.disabled}
          onChange={() => onChange?.(option.value)}
          className="jk-radio__input"
        />
        <span className="jk-radio__box">
          <span className="jk-radio__dot" />
        </span>
        {/* <s>, not a line-through in CSS. The strike is the meaning here rather than
            decoration, and s is the element for "no longer accurate" — so it survives
            a stylesheet that does not load, and assistive tech that announces it. */}
        {option.disabled ? <s className="jk-struck">{option.label}</s> : option.label}
      </label>
    ))}
  </div>
);
