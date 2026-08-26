import Link from "next/link";
import { AnnotationTone, DecryptAlphabet, MarqueeTone } from "@/models";
import { FOOTER, NAV_ITEMS, TICKER, TICKER_STRUCK } from "@/data/site";
import { Annotation } from "../core/Annotation";
import { DecryptedText } from "../core/DecryptedText";
import { Marquee } from "../core/Marquee";

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
export const SiteFooter = () => (
  <footer className="jk-footer">
    <Marquee tone={MarqueeTone.Ink} className="jk-footer__ticker">
      <span>
        <s className="jk-struck">{TICKER_STRUCK.retired}</s> {TICKER_STRUCK.current}
      </span>
      {TICKER.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </Marquee>

    <nav aria-label="Sections" className="jk-footer__nav">
      {NAV_ITEMS.map((item) => (
        <Link key={item.id} href={item.href} className="jk-footer__nav-link">
          {item.label}
        </Link>
      ))}
    </nav>

    <div className="jk-footer__bar">
      <Annotation>© 2026 jaako andes</Annotation>
      <Annotation>{FOOTER.credit}</Annotation>
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
