import type { ReactNode } from "react";
import { AnnotationTone } from "@/models";
import { cx } from "@/utils/cx";
import { Annotation } from "./Annotation";

export type SectionHeadProps = {
  /** Two-digit index — "01". The editorial spine of the page. */
  index: string;
  /** Right-aligned note: entry counts, dates, a dry aside. Decorative by default. */
  note?: ReactNode;
  /** Renders the note in the accessible tone when it carries real information. */
  noteIsInformational?: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * Index, title and note on one baseline.
 *
 * The self-drawing hairline that used to run between the title and the note is gone.
 * It was the most-repeated stroke on the page, and against a photographic ground a
 * line across every section head read as a scratch on the glass rather than as
 * structure. The note is pushed to the far end with margin instead, which is the same
 * arrangement minus the rule.
 *
 * The horizontal arrangement itself stays, and it is still the point: stacking these
 * makes each section announce itself like a landing-page block, while setting them on
 * a line makes the page read as a catalogue.
 */
export const SectionHead = ({
  index,
  note,
  noteIsInformational = false,
  className,
  children,
}: SectionHeadProps) => (
  <header className={cx("jk-head", className)}>
    <span className="jk-head__index" data-reveal>
      {index}
    </span>
    <h2 className="jk-head__title" data-reveal>
      {children}
    </h2>
    {note ? (
      <Annotation
        tone={noteIsInformational ? AnnotationTone.Info : AnnotationTone.Decorative}
        className="jk-head__note"
      >
        {note}
      </Annotation>
    ) : null}
  </header>
);
