import type { ReactNode } from "react";
import { AnnotationTone } from "@/models";
import { CONTACT_SPEC } from "@/data/site";
import { Annotation } from "../core/Annotation";

export type SpecBlockProps = {
  children?: ReactNode;
};

/**
 * The contact panel as a pharmaceutical label.
 *
 * Rules top and bottom, the name set as a product, the channels as dosage information.
 * It is the driest possible treatment of a contact section, which is exactly why it
 * reads as designed rather than defaulted, and it is the one place the Spiritualized
 * reference is literal rather than atmospheric.
 *
 * The heavy rule above the name and the hairline below it are decorative, not <hr>:
 * they divide the label visually, not the document semantically.
 */
export const SpecBlock = ({ children }: SpecBlockProps) => (
  <div className="jk-spec">
    <span aria-hidden="true" className="jk-spec__rule jk-spec__rule--heavy" />
    <p className="jk-spec__name">
      {CONTACT_SPEC.name}
      <sup className="jk-spec__mark">&reg;</sup>
    </p>
    <p className="jk-spec__subtitle">{CONTACT_SPEC.subtitle}</p>
    <span aria-hidden="true" className="jk-spec__rule" />

    {children}

    <Annotation tone={AnnotationTone.Decorative} className="jk-spec__footnote">
      {CONTACT_SPEC.footnote}
    </Annotation>
  </div>
);
