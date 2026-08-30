import { AnnotationTone, DecryptAlphabet } from "@/models";
import { HERO } from "@/data/site";
import { cx } from "@/utils/cx";
import { Annotation } from "../core/Annotation";
import { DecryptedText } from "../core/DecryptedText";
import { Rule } from "../core/Rule";

export type MastheadBarProps = {
  className?: string;
};

/**
 * The identity strip: kicker, dimension rule, coordinates, hairline under the lot.
 *
 * It was written inline in Hero and was the masthead's alone. It is a component now
 * because it is the one piece of furniture that should read the same on every page
 * the site owns — /work, /experience, /lab and the pages under them open with the
 * same two readouts the homepage opens with, so a sub-page announces itself as part
 * of this site before it announces what it is.
 *
 * The copy is HERO.kicker and HERO.coords rather than a per-page string, and that is
 * the point rather than a shortcut: a bar that said something different on each page
 * would be a heading, and there is already a SectionHead under it doing that job.
 *
 * Both readouts settle on arrival. Mono, so a substituted glyph cannot change the
 * chip's width while it runs; see DecryptedText for why that matters here and not in
 * proportional copy.
 */
export const MastheadBar = ({ className }: MastheadBarProps) => (
  <div className={cx("jk-bar", className)}>
    <div className="jk-bar__row">
      {/* Info, not Decorative, and that is a colour decision with an accessibility
          consequence attached rather than the other way round. Decorative is
          --text-faint (3.97:1) and the component hides it from screen readers precisely
          because it fails AA; darkening it to --text-dim (4.87:1) removes the reason it
          was hidden. The coordinates are the only place on the page that says where the
          work is done from, so that is the right outcome anyway. */}
      <Annotation tone={AnnotationTone.Info}>
        <DecryptedText text={HERO.kicker} alphabet={DecryptAlphabet.Upper} duration={1620} />
      </Annotation>
      <Rule tick />
      <Annotation tone={AnnotationTone.Info}>
        <DecryptedText text={HERO.coords} alphabet={DecryptAlphabet.Upper} />
      </Annotation>
    </div>

    {/* The mark under the row. Decorative: it is a stroke, and there is nothing in it
        for a screen reader to announce. */}
    <span aria-hidden="true" className="jk-bar__crossline" />
  </div>
);
