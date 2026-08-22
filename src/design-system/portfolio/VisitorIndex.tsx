import { AnnotationTone } from "@/models";
import { VISITOR_INDEX } from "@/data/site";
import { toDigits } from "@/utils/format";
import { cx } from "@/utils/cx";
import { Annotation } from "../core/Annotation";

export type VisitorIndexProps = {
  count?: number;
  digits?: number;
  className?: string;
};

/**
 * The hit counter, recast as a calibrated readout.
 *
 * Same number, same joke — it is just wearing a lab coat now. The odometer itself is
 * decorative (a screen reader gets the figure from the visually-hidden text instead of
 * seven separate digits), and the unit label underneath is where the gag actually
 * lives.
 */
export const VisitorIndex = ({
  count = VISITOR_INDEX.count,
  digits = 7,
  className,
}: VisitorIndexProps) => (
  <div className={cx("jk-visitor", className)}>
    <span aria-hidden="true" className="jk-visitor__display">
      {toDigits({ count, length: digits }).map((digit, index) => (
        <span key={index} className="jk-visitor__digit">
          {digit}
        </span>
      ))}
    </span>
    <span className="jk-sr-only">{count.toLocaleString("en-GB")} visitors</span>
    <Annotation tone={AnnotationTone.Decorative}>{VISITOR_INDEX.unit}</Annotation>
  </div>
);
