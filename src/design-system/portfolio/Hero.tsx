import { AnnotationTone, DecryptAlphabet, DecryptMode } from "@/models";
import { HERO } from "@/data/site";
import { Annotation } from "../core/Annotation";
import { DecryptedText } from "../core/DecryptedText";
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
 *
 * THAT LAST SENTENCE SURVIVED THE SETTLING READOUTS, WHICH IS WHY THEY ARE SHAPED THE
 * WAY THEY ARE. DecryptedText is a client component, so putting one in the masthead
 * could have dragged the whole header across the boundary. It does not: this file has
 * no "use client", the four readouts are client leaves inside a server tree, and each
 * one renders its real text on the server and only splits into per-character spans
 * once it starts moving. The server HTML for the name is what it was before.
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
    {/* Both settle, and this row is the best case for it in the whole page: mono, so
        every substituted glyph has the same advance and the chips cannot change width
        while they run. The kicker is overridden faster than the default because 32
        characters at 50ms is 1.6s, which is a long time to hold an unreadable string
        directly under a reader's eye on arrival; the coordinates are shorter and keep
        the default. */}
    <div className="jk-hero__top">
      <Annotation tone={AnnotationTone.Info}>
        <DecryptedText text={HERO.kicker} alphabet={DecryptAlphabet.Mono} speed={35} />
      </Annotation>
      <Rule tick />
      <Annotation tone={AnnotationTone.Info}>
        <DecryptedText text={HERO.coords} alphabet={DecryptAlphabet.Mono} />
      </Annotation>
    </div>

    {/* The thin rule between the annotation row and the name. Decorative: it is a
        mark, and there is nothing in it for a screen reader to announce. */}
    <span aria-hidden="true" className="jk-hero__crossline" />

    {/* TWO INSTANCES RATHER THAN ONE, BECAUSE THE ACCENT IS NOT A COLOUR HERE.
        DecryptedText takes a string, so it cannot carry the <span> the warm half needs
        — and that span is not decoration it could be handed later: .jk-hero__accent
        re-runs the whole background-clip recipe with the ember sheet, because a child
        that only set `color` would paint opaque over the parent's grain. So each half
        settles inside the element that owns its own clip.

        They stay in step for free. Both halves are six characters and both start on the
        same `is-in`, so at one speed they resolve on the same tick — the split is
        invisible while it runs. If HERO.title ever changes so the halves are different
        lengths, that stops being true and the speeds have to be set against each other.

        Slower than the default because six characters at 50ms is over in 300ms, which
        at --text-5xl reads as a flicker rather than as a readout settling. */}
    <h1 className="jk-hero__title" data-reveal>
      <DecryptedText text={titleLead} speed={70} />
      <span className="jk-hero__accent">
        <DecryptedText text={HERO.title_accent} speed={70} />
      </span>
    </h1>

    <div className="jk-hero__content">
      <div className="jk-hero__row">
        {/* THE ONE ON TRIAL. Everything else that settles on this page is a short mono
            readout; this is 109 characters of proportional body copy, which breaks both
            of the rules that make the others safe.

            Burst rather than Sequential for the first: Sequential is text.length * speed
            and would scramble for 5.4 seconds. Burst is ten ticks whatever the length,
            so it is over in 500ms and costs ten renders instead of a hundred and nine.

            The second cannot be fixed from here. Helvetica is proportional, so every
            substituted glyph changes its word's width, and a paragraph that changes word
            widths re-wraps — the lines will shuffle for the duration and anything below
            will move with them. Only the struck clause and the metadata column sit under
            it, so the blast radius is small, but it is real and it is the thing to judge.
            If it reads badly, delete the wrapper and put {HERO.blurb} back. */}
        <p className="jk-hero__blurb" data-reveal data-delay="2">
          <DecryptedText text={HERO.blurb} mode={DecryptMode.Burst} />{" "}
          <s className="jk-struck">{HERO.struck.retired}</s> {HERO.struck.current}
        </p>
        <DefinitionList items={HERO.meta} className="jk-hero__meta" />
      </div>
      <HeroActions />
    </div>
  </header>
);
