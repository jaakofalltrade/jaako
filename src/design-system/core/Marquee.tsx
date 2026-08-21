import type { CSSProperties, ReactNode } from "react";
import { MARQUEE_TONE_CLASS } from "@/constants/ui";
import { MarqueeTone } from "@/models";
import { cx } from "@/utils/cx";

export type MarqueeProps = {
  /** Scroll duration, e.g. "18s". Continuous, so it rides in as a custom property. */
  speed?: string;
  tone?: MarqueeTone;
  className?: string;
  children?: ReactNode;
};

export const Marquee = ({
  speed,
  tone = MarqueeTone.Void,
  className,
  children,
}: MarqueeProps) => (
  <div className={cx("jk-marquee", MARQUEE_TONE_CLASS[tone], className)}>
    <div
      className="jk-marquee__track"
      style={speed === undefined ? undefined : ({ "--marquee-dur": speed } as CSSProperties)}
    >
      <span className="jk-marquee__group">{children}</span>
      <span className="jk-marquee__group" aria-hidden="true">
        {children}
      </span>
    </div>
  </div>
);
