export interface HitCounterProps {
  count?: number;
  digits?: number;
  label?: string;
  className?: string;
}

export function HitCounter({
  count = 1985057,
  digits = 7,
  label = "visitors",
  className,
}: HitCounterProps) {
  const str = String(count).padStart(digits, "0").slice(-digits);

  return (
    <div className={["jk-hit-counter", className].filter(Boolean).join(" ")}>
      <span className="jk-hit-counter__display">
        {str.split("").map((d, i) => (
          <span key={i} className="jk-hit-counter__digit">
            {d}
          </span>
        ))}
      </span>
      <span className="jk-hit-counter__label">{label}</span>
    </div>
  );
}
