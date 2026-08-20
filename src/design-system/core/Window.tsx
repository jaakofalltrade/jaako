import type { ReactNode } from "react";

export interface WindowProps {
  title?: string;
  controls?: boolean;
  footer?: ReactNode;
  tone?: "plate" | "void";
  padded?: boolean;
  rivets?: boolean;
  className?: string;
  children?: ReactNode;
}

const RIVETS = ["tl", "tr", "bl", "br"] as const;

export function Window({
  title = "untitled",
  controls = true,
  footer,
  tone = "plate",
  padded = true,
  rivets = true,
  className,
  children,
}: WindowProps) {
  const classes = ["jk-window", tone === "void" ? "jk-window--void" : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="jk-window__titlebar">
        <span className="jk-window__title">{title}</span>
        {controls ? (
          <div className="jk-window__controls">
            {["_", "□", "×"].map((g) => (
              <span key={g} className="jk-window__control">
                {g}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {rivets
        ? RIVETS.map((pos) => (
            <span key={pos} aria-hidden="true" className={`jk-window__rivet jk-window__rivet--${pos}`} />
          ))
        : null}
      <div className={`jk-window__body${padded ? "" : " jk-window__body--flush"}`}>{children}</div>
      {footer ? <div className="jk-window__footer">{footer}</div> : null}
    </div>
  );
}
