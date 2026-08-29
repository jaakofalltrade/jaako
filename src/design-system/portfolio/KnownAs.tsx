import { PRESENCE_CLASS, PRESENCE_LABEL } from "@/constants";
import { HANDLES } from "@/data/handles";
import { AnnotationTone, DecryptAlphabet } from "@/models";
import { cx } from "@/utils/cx";
import { Annotation } from "../core/Annotation";
import { DecryptedText } from "../core/DecryptedText";

/**
 * The handles, under the label they earn.
 *
 * This started as a guestbook signed by invented visitors, became a signature log
 * signed by the owner's own handles, and is now just the list of them —
 * which is what it had already become in fact, since a log implies visitors and
 * every name in it was his. "Signature log" was the last piece of the old framing
 * still standing.
 *
 * Presence is the one thing kept from the guestbook, because it is the one thing that
 * was never about visitors: the dot says which handle he is reachable under now. It
 * carries a visible status word for screen readers rather than a title attribute.
 */
export const KnownAs = () => (
  <ul className="jk-aka">
    {HANDLES.map((handle) => (
      <li key={handle.name} className="jk-aka__row">
        <span aria-hidden="true" className={cx("jk-aka__dot", PRESENCE_CLASS[handle.status])} />
        {/* Lower, not Upper: .jk-aka__name is mono but carries no text-transform, so it
            renders exactly as authored. Scrambling it through the capitals pool would
            show a column of capitals dropping to lowercase on the final frame. */}
        <span className="jk-aka__name">
          <DecryptedText text={handle.name} alphabet={DecryptAlphabet.Lower} />
        </span>
        <span className="jk-sr-only">({PRESENCE_LABEL[handle.status]})</span>
      </li>
    ))}
    <li className="jk-aka__row jk-aka__row--total">
      <Annotation tone={AnnotationTone.Decorative}>
        <DecryptedText
          text={`${HANDLES.length} handles, one person`}
          alphabet={DecryptAlphabet.Upper}
        />
      </Annotation>
    </li>
  </ul>
);
