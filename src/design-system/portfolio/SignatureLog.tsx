import { PRESENCE_CLASS, PRESENCE_LABEL } from "@/constants/ui";
import { GUESTBOOK } from "@/data/guestbook";
import { AnnotationTone } from "@/models";
import { cx } from "@/utils/cx";
import { Annotation } from "../core/Annotation";

/**
 * The guestbook, recast as a signed log.
 *
 * Presence used to be a coloured dot alone, which meant the only thing distinguishing
 * an online signature from an offline one was hue. The dot now carries a visible
 * status word for screen readers rather than a title attribute.
 */
export const SignatureLog = () => (
  <ul className="jk-log">
    {GUESTBOOK.map((entry) => (
      <li key={entry.who} className="jk-log__row">
        <span aria-hidden="true" className={cx("jk-log__dot", PRESENCE_CLASS[entry.status])} />
        <span className="jk-log__who">{entry.who}</span>
        <span className="jk-sr-only">({PRESENCE_LABEL[entry.status]})</span>
        <span className="jk-log__msg">{entry.message}</span>
      </li>
    ))}
    <li className="jk-log__row jk-log__row--total">
      <Annotation tone={AnnotationTone.Decorative}>
        {GUESTBOOK.length} signatures on file
      </Annotation>
    </li>
  </ul>
);
