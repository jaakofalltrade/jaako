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
/**
 * Split on its own accent so src/data/site.ts stays free of JSX, exactly as Hero does
 * with the masthead name. Same word, same colour, same reason.
 */
const specLead = CONTACT_SPEC.name.slice(0, CONTACT_SPEC.name.length - CONTACT_SPEC.name_accent.length);

export const SpecBlock = ({ children }: SpecBlockProps) => (
  <div className="jk-spec">
    <span aria-hidden="true" className="jk-spec__rule jk-spec__rule--heavy" />
    <p className="jk-spec__name">
      {specLead}
      <span className="jk-spec__accent">{CONTACT_SPEC.name_accent}</span>
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
