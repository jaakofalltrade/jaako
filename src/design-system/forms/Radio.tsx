"use client";

export interface RadioProps {
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  className?: string;
}

export function Radio({ options, value, onChange, name = "radio", className }: RadioProps) {
  return (
    <div className={["jk-radio", className].filter(Boolean).join(" ")}>
      {options.map((o) => (
        <label key={o} className="jk-radio__option">
          <input
            type="radio"
            name={name}
            value={o}
            checked={o === value}
            onChange={() => onChange?.(o)}
            className="jk-radio__input"
          />
          <span className="jk-radio__box">
            <span className="jk-radio__dot" />
          </span>
          {o}
        </label>
      ))}
    </div>
  );
}
