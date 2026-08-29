import { AnnotationTone } from "@/models";
import { TECH_LABEL } from "@/constants";
import { TECH_STACK } from "@/data/techStack";
import {
  ABOUT_BODY,
  ABOUT_LEAD,
  ABOUT_LEAD_EMPHASIS,
  ABOUT_META,
  NAV_ITEMS,
  SECTIONS,
} from "@/data/site";
import { Annotation } from "../core/Annotation";
import { DefinitionList } from "../core/DefinitionList";
import { SectionHead } from "../core/SectionHead";
import { SectionNav } from "../core/SectionNav";
import { Hero } from "../portfolio/Hero";
import { InstrumentStrip } from "../portfolio/InstrumentStrip";

/**
 * The lead sentence carries one emphasised phrase. Splitting on it rather than storing
 * markup in the data file keeps src/data/site.ts free of JSX — the copy stays a
 * string, and the emphasis stays a presentation decision.
 */
const [leadBefore, leadAfter] = ABOUT_LEAD.split(ABOUT_LEAD_EMPHASIS);

/**
 * The section index sits here rather than in PageShell.
 *
 * It is above #about and not inside it, which is deliberate: the nav is not part of
 * what the about section is about, and nesting it would put a <nav> inside a landmark
 * that a screen reader has just announced as the about region.
 */
export const AboutSection = () => (
  <>
    <Hero />
    <InstrumentStrip />
    <SectionNav items={NAV_ITEMS} />
    <section id="about" className="jk-section jk-about">
      <SectionHead index={SECTIONS.about.index} note={SECTIONS.about.note}>
        {SECTIONS.about.title}
      </SectionHead>

      <div className="jk-about__grid">
        <Annotation tone={AnnotationTone.Decorative} className="jk-about__mark">
          § 1.0
        </Annotation>

        <div className="jk-about__body">
          <p className="jk-about__lead" data-reveal>
            {leadBefore}
            <em className="jk-about__emphasis">{ABOUT_LEAD_EMPHASIS}</em>
            {leadAfter}
          </p>
          {ABOUT_BODY.map((paragraph) => (
            <p key={paragraph} className="jk-about__text" data-reveal data-delay="1">
              {paragraph}
            </p>
          ))}
          <ul className="jk-stack" data-reveal data-delay="2">
            {TECH_STACK.map((tech) => (
              <li key={tech} className="jk-stack__item">
                {TECH_LABEL[tech]}
              </li>
            ))}
          </ul>
        </div>

        {/* Unruled. The rule under every pair was one of the repeated strokes the
            redesign removed; the grid gap separates the rows perfectly well. */}
        <DefinitionList items={ABOUT_META} className="jk-about__meta" />
      </div>
    </section>
  </>
);
