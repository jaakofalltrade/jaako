import type { SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: string[];
  wrapperClassName?: string;
}

export function Select({ options, className, wrapperClassName, ...rest }: SelectProps) {
  return (
    <div className={["jk-select", wrapperClassName].filter(Boolean).join(" ")}>
      <select className={["jk-select__control", className].filter(Boolean).join(" ")} {...rest}>
        {options.map((o) => (
          <option key={o} value={o} className="jk-select__option">
            {o}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="jk-select__chevron">
        ▼
      </span>
    </div>
  );
}
