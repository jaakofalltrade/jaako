import { AnnotationTone, DecryptAlphabet } from "@/models";
import { VISITOR_INDEX } from "@/data/site";
import { toDigits } from "@/utils/format";
import { cx } from "@/utils/cx";
import { Annotation } from "../core/Annotation";
import { DecryptedText } from "../core/DecryptedText";

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
    {/* Each digit settles in its own box, on the Digits pool so a counter never spins
        up through letters. They are one-character strings, which makes the Sequential
        default degenerate — nothing to walk along — so each simply scrambles for the
        duration and lands, and since they share it the odometer settles as one row.

        The whole display is already aria-hidden and the figure is announced by the
        visually-hidden line below, so the seven components add nothing for a screen
        reader to trip over. */}
    <span aria-hidden="true" className="jk-visitor__display">
      {toDigits({ count, length: digits }).map((digit, index) => (
        <span key={index} className="jk-visitor__digit">
          <DecryptedText text={digit} alphabet={DecryptAlphabet.Digits} />
        </span>
      ))}
    </span>
    <span className="jk-sr-only">{count.toLocaleString("en-GB")} visitors</span>
    <Annotation tone={AnnotationTone.Decorative}>
      <DecryptedText text={VISITOR_INDEX.unit} alphabet={DecryptAlphabet.Upper} />
    </Annotation>
  </div>
);
