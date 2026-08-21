import type { ReactNode } from "react";
import { BADGE_TONE_CLASS } from "@/constants/ui";
import { BadgeTone } from "@/models";
import { cx } from "@/utils/cx";

export type BadgeProps = {
  tone?: BadgeTone;
  blink?: boolean;
  className?: string;
  children?: ReactNode;
};

export const Badge = ({
  tone = BadgeTone.Steel,
  blink = false,
  className,
  children,
}: BadgeProps) => (
  <span className={cx("jk-badge", BADGE_TONE_CLASS[tone], blink && "jk-badge--blink", className)}>
    {children}
  </span>
);
