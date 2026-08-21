import { toDigits } from "@/utils/format";
import { cx } from "@/utils/cx";

export type HitCounterProps = {
  count?: number;
  digits?: number;
  label?: string;
  className?: string;
};

export const HitCounter = ({
  count = 1985057,
  digits = 7,
  label = "visitors",
  className,
}: HitCounterProps) => (
  <div className={cx("jk-hit-counter", className)}>
    <span className="jk-hit-counter__display">
      {toDigits({ count, length: digits }).map((digit, index) => (
        <span key={index} className="jk-hit-counter__digit">
          {digit}
        </span>
      ))}
    </span>
    <span className="jk-hit-counter__label">{label}</span>
  </div>
);
