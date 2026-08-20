import type { ReactNode } from "react";

export interface SectionHeadingProps {
  children?: ReactNode;
  kicker?: ReactNode;
  rule?: boolean;
  tone?: "light" | "dim";
  className?: string;
}

export function SectionHeading({
  children,
  kicker,
  rule = true,
  tone = "light",
  className,
}: SectionHeadingProps) {
  const classes = ["jk-section-heading", className].filter(Boolean).join(" ");
  const titleClasses = [
    "jk-section-heading__title",
    tone === "dim" ? "jk-section-heading__title--dim" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={classes}>
      {kicker ? <span className="jk-section-heading__kicker">{kicker}</span> : null}
      <h2 className={titleClasses}>{children}</h2>
      {rule ? <span className="jk-section-heading__rule" /> : null}
    </header>
  );
}
