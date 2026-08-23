import { AnnotationTone } from "@/models";
import { HERO } from "@/data/site";
import { Annotation } from "../core/Annotation";
import { DefinitionList } from "../core/DefinitionList";
import { Rule } from "../core/Rule";
import { HeroActions } from "./HeroActions";

/**
 * The masthead: one column, read top to bottom.
 *
 * The name used to be set vertically down the left edge, which is why this was a grid
 * with a rotated full-height first column. It is back in the flow now — horizontal,
 * upright, sitting between the annotation row and the status slab — so the grid went
 * with it and the header is a plain stack.
 *
 * Two things came off the title with the rotation. The inner <span> existed only to
 * carry a 180° transform that the reveal system would otherwise have wiped when it
 * set `transform: none` on .is-in; with nothing to rotate, the heading carries
 * data-reveal on its own. And the slant is gone: italic display type at this size was
 * doing the work the rotation used to, and upright is what the name wants now that it
 * reads left to right like everything under it.
 *
 * A server component: only the single call to action needs interactivity, and it is
 * split out into HeroActions so the lettering stays server-rendered.
 */
/**
 * The name is one string in the data file and two elements here, split on its own
 * accent so src/data/site.ts stays free of JSX — the same trade AboutSection makes
 * with ABOUT_LEAD_EMPHASIS. The copy stays a string; which half is warm stays a
 * presentation decision.
 */
const titleLead = HERO.title.slice(0, HERO.title.length - HERO.title_accent.length);

export const Hero = () => (
  <header className="jk-hero">
    {/* Info, not Decorative, and that is a colour decision with an accessibility
        consequence attached rather than the other way round. Decorative is
        --text-faint (3.97:1) and the component hides it from screen readers precisely
        because it fails AA; darkening it to --text-dim (4.87:1) removes the reason it
        was hidden, so the tone changes with the colour and the two annotations join
        the accessibility tree. The coordinates are the only place on the page that
        says where the work is done from, so that is the right outcome anyway. */}
    <div className="jk-hero__top">
      <Annotation tone={AnnotationTone.Info}>{HERO.kicker}</Annotation>
      <Rule tick />
      <Annotation tone={AnnotationTone.Info}>{HERO.coords}</Annotation>
    </div>

    {/* The thin rule between the annotation row and the name. Decorative: it is a
        mark, and there is nothing in it for a screen reader to announce. */}
    <span aria-hidden="true" className="jk-hero__crossline" />

    <h1 className="jk-hero__title" data-reveal>
      {titleLead}
      <span className="jk-hero__accent">{HERO.title_accent}</span>
    </h1>

    <div className="jk-hero__content">
      <div className="jk-hero__row">
        <p className="jk-hero__blurb" data-reveal data-delay="2">
          {HERO.blurb} <s className="jk-struck">{HERO.struck.retired}</s> {HERO.struck.current}
        </p>
        <DefinitionList items={HERO.meta} className="jk-hero__meta" />
      </div>
      <HeroActions />
    </div>
  </header>
);
