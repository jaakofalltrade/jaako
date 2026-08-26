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
        while they run. The kicker runs slightly shorter than the coordinates because it
        is the one string here a reader is likely to try to read on arrival, and holding
        it illegible is a different cost from holding a set of coordinates illegible. */}
    <div className="jk-hero__top">
      <Annotation tone={AnnotationTone.Info}>
        <DecryptedText text={HERO.kicker} alphabet={DecryptAlphabet.Upper} duration={1620} />
      </Annotation>
      <Rule tick />
      <Annotation tone={AnnotationTone.Info}>
        <DecryptedText text={HERO.coords} alphabet={DecryptAlphabet.Upper} />
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

        They stay in step for free, and they keep doing so whatever the copy becomes.
        Run time is elapsed-time-driven rather than per-character, so two halves given
        the same duration finish together even if HERO.title is ever re-split unevenly.

        Much shorter than the rest: the name is the one thing here nobody needs to read,
        because a returning visitor already knows it and a new one is about to have it
        told to them four more ways down the page. Holding the masthead illegible for
        the 1.7s the coordinates get would be showing off.

        THE NAME IS THE ONLY THING ON THE PAGE THAT RUNS MORE THAN ONCE. Once a minute,
        at an unpredictable moment inside that minute, it settles again — the masthead
        as the one live instrument rather than a thing that happened during loading.
        Both halves take the same replayEvery and DecryptedText derives the moment from
        the wall clock instead of drawing it, so they fire on the same tick without
        knowing about each other; see nextReplayAt for why that had to be deterministic.

        Everything else stays once-only. A page where several things restart on their
        own timers stops reading as an instrument and starts reading as a screensaver. */}
    <h1 className="jk-hero__title" data-reveal>
      <DecryptedText text={titleLead} duration={920} replayEvery={60_000} />
      <span className="jk-hero__accent">
        <DecryptedText text={HERO.title_accent} duration={920} replayEvery={60_000} />
      </span>
    </h1>

    <div className="jk-hero__content">
      <div className="jk-hero__row">
        {/* THE ONE ON TRIAL. Everything else that settles on this page is a short mono
            readout; this is 109 characters of proportional body copy, which breaks both
            of the rules that make the others safe.

            Burst rather than Sequential for the first: a boundary crawling left to
            right through a sentence is an invitation to try to read it while it moves,
            which is unpleasant in a way it is not on a reference code. Burst holds the
            whole thing and lands it at once.

            The second cannot be fixed from here. Helvetica is proportional, so every
            substituted glyph changes its word's width, and a paragraph that changes word
            widths re-wraps. Measured over 30 scrambles at each of eight column widths:
            it gains a line — a 29px jump, which shoves the call to action down — in
            about 1 frame in 30 at desktop widths, and 8 in 30 around a 380px column.

            AND LENGTHENING THE RUN MAKES THAT WORSE, WHICH IS THE TRADE TO KNOW ABOUT.
            The risk is per frame, so at 45ms a frame this is roughly 22 rolls of the
            dice rather than the 11 it was at 500ms. Every other readout on the page
            gets better with a longer duration; this is the one that gets worse.
            If it reads badly, delete the wrapper and put {HERO.blurb} back. */}
        <p className="jk-hero__blurb" data-reveal data-delay="2">
          <DecryptedText text={HERO.blurb} mode={DecryptMode.Burst} duration={1000} />{" "}
          <s className="jk-struck">{HERO.struck.retired}</s> {HERO.struck.current}
        </p>
        <DefinitionList items={HERO.meta} className="jk-hero__meta" />
      </div>
      <HeroActions />
    </div>
  </header>
);
