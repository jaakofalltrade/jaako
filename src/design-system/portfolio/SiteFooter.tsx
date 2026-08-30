import { Fragment } from "react";
import Link from "next/link";
import { AnnotationTone, DecryptAlphabet, MarqueeTone } from "@/models";
import type { CreditPart } from "@/models";
import { FOOTER, NAV_ITEMS, TICKER, TICKER_STRUCK } from "@/data/site";
import { Annotation } from "../core/Annotation";
import { DecryptedText } from "../core/DecryptedText";
import { Marquee } from "../core/Marquee";
import { Struck } from "../core/Struck";

/**
 * The footer, and the site's only navigation that appears on every page.
 *
 * That second job is new, and it is what makes dropping the sticky bar safe. The
 * section index now renders inline above the about section, which only exists on the
 * homepage — so without this list /work and /work/<slug> would be dead ends with no
 * way back into the page they belong to. These links are absolute, unlike the inline
 * copy's bare fragments, because they have to work from another route.
 *
 * The hairline that used to sit above the ticker is gone with the rest of the
 * repeated strokes; the footer's own padding separates it from the last section.
 */
type CreditLineProps = {
  parts: CreditPart[];
};

/**
 * A line of the footer bar, some runs of which go somewhere.
 *
 * Both lines in the bar are this shape now — the copyright hides one link in the name,
 * the credit hides three in its adjectives — so the mapping is written once. It is a
 * local component rather than an exported one because that is the whole extent of it:
 * it knows about CreditPart and about one class name, and a second caller outside this
 * file would be a sign the footer bar had grown into something else.
 *
 * NOTHING IN THE STYLING SAYS A RUN IS A LINK. .jk-footer__egg in layout/_footer.scss
 * inherits colour and size and only lifts an underline on hover. That is the design
 * rather than an omission: the bar has to read as two flat lines, because a footer
 * wearing four underlines reads as a nav and sends the reader looking for something
 * useful behind them. Which runs are links is the copy's business — see FOOTER.
 */
const CreditLine = ({ parts }: CreditLineProps) => (
  <Annotation>
    {parts.map((part) =>
      part.href ? (
        <a
          key={part.text}
          href={part.href}
          target="_blank"
          rel="noreferrer"
          className="jk-footer__egg"
        >
          {part.text}
        </a>
      ) : (
        <Fragment key={part.text}>{part.text}</Fragment>
      ),
    )}
  </Annotation>
);

export const SiteFooter = () => (
  <footer className="jk-footer">
    <Marquee tone={MarqueeTone.Ink} className="jk-footer__ticker">
      <span>
        <Struck retired={TICKER_STRUCK.retired} current={TICKER_STRUCK.current} />
      </span>
      {TICKER.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </Marquee>

    <nav aria-label="Sections" className="jk-footer__nav">
      {NAV_ITEMS.map((item) => (
        <Link key={item.label} href={item.href} className="jk-footer__nav-link">
          {item.label}
        </Link>
      ))}
    </nav>

    <div className="jk-footer__bar">
      <CreditLine parts={FOOTER.copyright} />
      <CreditLine parts={FOOTER.credit} />
      {/* The plate spec settles too, and it is the only one of the five that is below
          the fold — so it is also the only one that proves the trigger is the page's
          scroll observer rather than page load. Decorative, so Annotation puts
          aria-hidden on the wrapper and the component's screen-reader copy inside it is
          inert; that is the right outcome for a line that is texture by definition.
          The longest run on the site, because nothing is waiting on it: a reader who has
          reached the last line of the page has arrived rather than passed through. */}
      <Annotation tone={AnnotationTone.Decorative} className="jk-footer__spec">
        <DecryptedText text={FOOTER.spec} alphabet={DecryptAlphabet.Upper} duration={2200} />
      </Annotation>
    </div>
  </footer>
);
