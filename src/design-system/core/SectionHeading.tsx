import type { ReactNode } from "react";
import { HEADING_TONE_CLASS } from "@/constants/ui";
import { HeadingTone } from "@/models";
import { cx } from "@/utils/cx";

export type SectionHeadingProps = {
  children?: ReactNode;
  kicker?: ReactNode;
  rule?: boolean;
  tone?: HeadingTone;
  className?: string;
};

export const SectionHeading = ({
  children,
  kicker,
  rule = true,
  tone = HeadingTone.Light,
  className,
}: SectionHeadingProps) => (
  <header className={cx("jk-section-heading", className)}>
    {kicker ? <span className="jk-section-heading__kicker">{kicker}</span> : null}
    <h2 className={cx("jk-section-heading__title", HEADING_TONE_CLASS[tone])}>{children}</h2>
    {rule ? <span className="jk-section-heading__rule" /> : null}
  </header>
);
