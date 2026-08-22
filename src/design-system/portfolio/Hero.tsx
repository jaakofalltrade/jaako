import { AnnotationTone } from "@/models";
import { HERO } from "@/data/site";
import { Annotation } from "../core/Annotation";
import { DefinitionList } from "../core/DefinitionList";
import { GlassPanel } from "../core/GlassPanel";
import { Rule } from "../core/Rule";
import { HeroActions } from "./HeroActions";

/**
 * The masthead: the name set vertically down the left edge, everything else beside it.
 *
 * The title had to come out of .jk-hero__content to do that. It is a sibling of the
 * body now rather than the first thing inside it, because the rotation makes it a
 * full-height column of its own — nested in the content flow it could only ever be a
 * rotated block sitting in a horizontal stack, which is not the same shape.
 *
 * It also lost its .jk-mask wrapper. The mask reveal slides an inner span on translateY
 * behind an overflow:hidden parent, and composing that with the 180° rotation that
 * makes the name read bottom-to-top gives a wipe running the wrong way. A plain
 * data-reveal fade is the honest version of the same idea here.
 *
 * A server component: only the single call to action needs interactivity, and it is
 * split out into HeroActions so the lettering stays server-rendered.
 */
export const Hero = () => (
  <header className="jk-hero">
    {/* The inner span is load-bearing and not decoration. The rotation that makes the
        name read bottom-to-top has to live on a different element from the one
        carrying data-reveal: the reveal system animates transform and then sets
        `transform: none` on .is-in, which silently ate the rotation — computed style
        said `none` and the name quietly read top-to-bottom instead. Two elements, two
        transforms, neither fighting the other. */}
    <h1 className="jk-hero__title" data-reveal>
      <span>{HERO.title}</span>
    </h1>

    {/* The thin rule that crosses the name's axis at a right angle. Decorative: it is
        a mark, and there is nothing in it for a screen reader to announce. */}
    <span aria-hidden="true" className="jk-hero__crossline" />

    <div className="jk-hero__body">
      <div className="jk-hero__top">
        <Annotation tone={AnnotationTone.Decorative}>{HERO.kicker}</Annotation>
        <Rule tick />
        <Annotation tone={AnnotationTone.Decorative}>{HERO.coords}</Annotation>
      </div>

      <GlassPanel className="jk-hero__slab">
        <DefinitionList items={HERO.slab} className="jk-hero__slab-list" />
      </GlassPanel>

      <div className="jk-hero__content">
        <div className="jk-hero__row">
          <p className="jk-hero__blurb" data-reveal data-delay="2">
            {HERO.blurb} <s className="jk-struck">{HERO.struck.retired}</s> {HERO.struck.current}
          </p>
          <DefinitionList items={HERO.meta} className="jk-hero__meta" />
        </div>
        <HeroActions />
      </div>
    </div>
  </header>
);
