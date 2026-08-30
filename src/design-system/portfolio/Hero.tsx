import { DecryptMode } from "@/models";
import { HERO, HERO_STOP_HREF } from "@/data/site";
import { dropSuffix } from "@/utils/text";
import { DecryptedText } from "../core/DecryptedText";
import { DefinitionList } from "../core/DefinitionList";
import { Struck } from "../core/Struck";
import { HeroActions } from "./HeroActions";
import { MastheadBar } from "./MastheadBar";

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
const titleLead = dropSuffix({ text: HERO.title, suffix: HERO.title_accent });

/**
 * And the accent splits once more, on its full stop.
 *
 * The period is a link — the oldest joke on the internet, behind the smallest target
 * on the page; see HERO_STOP_HREF. It is peeled off here rather than stored as its own
 * field because it is punctuation, not copy: HERO.title stays the readable string
 * "jaako andes." in the data file, and nothing about the name changes if the joke is
 * ever deleted.
 *
 * dropSuffix returns the string whole when the suffix is not there, so a name that
 * stops carrying a period renders as it always did and the anchor below simply has
 * nothing left in it to click.
 */
const STOP = ".";

const accentLead = dropSuffix({ text: HERO.title_accent, suffix: STOP });

/** "." when the name ends in one, "" when it does not — see the note above. */
const stop = HERO.title_accent.slice(accentLead.length);

export const Hero = () => (
  <header className="jk-hero">
    {/* The identity strip, shared with every other page on the site. It carries its
        own crossline, so the masthead has nothing left to do here but pin the strip to
        the top of the header box - see .jk-hero__top in widgets/_hero.scss. */}
    <MastheadBar className="jk-hero__top" />

    <h1 className="jk-hero__title" data-reveal>
      <DecryptedText text={titleLead} duration={920} replayEvery={60_000} />
      <span className="jk-hero__accent">
        <DecryptedText text={accentLead} duration={920} replayEvery={60_000} />
        {/* The full stop, on its own, going somewhere.

            It sits OUTSIDE the accent's DecryptedText rather than inside it, and that
            is what keeps the joke from moving: a period that scrambled would spend
            most of a second as some other glyph, and a link whose text changes under
            the pointer is a different thing to click on than the one you aimed at. It
            is also the only character here that is never in doubt.

            aria-hidden with tabIndex -1 as a pair, deliberately. A link whose entire
            accessible name is "." announces as nothing useful and a keyboard user
            tabbing the masthead would land on a target with no destination they could
            read; hiding it without also removing it from the tab order would be the
            worst of both, a focusable element that assistive tech insists is not
            there. So it is out of both, which is the honest description of an easter
            egg. The name still reads "jaako andes" either way — this glyph carries no
            meaning a reader would miss.

            It repeats the accent's clip recipe in _hero.scss for the reason the accent
            repeats the title's: each element clips its own background to its own
            glyphs, so a period that only inherited would paint flat over the grain. */}
        {stop && (
          <a
            href={HERO_STOP_HREF}
            target="_blank"
            rel="noreferrer"
            aria-hidden="true"
            tabIndex={-1}
            className="jk-hero__stop"
          >
            {stop}
          </a>
        )}
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
          <Struck retired={HERO.struck.retired} current={HERO.struck.current} />
        </p>
        <DefinitionList items={HERO.meta} className="jk-hero__meta" />
      </div>
      <HeroActions />
    </div>
  </header>
);
