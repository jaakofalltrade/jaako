export type StruckProps = {
  /** The line that stopped being true. Rendered struck through. */
  retired: string;
  /** What replaced it. Rendered plainly, a space after the strike. */
  current: string;
};

/**
 * The running joke, as a component: a retired line crossed out with its replacement
 * beside it.
 *
 * Two places render it — the hero blurb and the footer ticker — and they were the same
 * markup against the same `{ retired, current }` shape, written out twice. It is not a
 * util because it is JSX; utils/ stays pure functions.
 *
 * Keeping the retired half in the document rather than deleting it is the entire
 * device. The site says what it used to say and then corrects itself, which is funnier
 * than only ever having said the second thing, and it is the same gag as the struck
 * radio options in the contact form.
 *
 * The strike is `<s>` rather than a class on a span because that is what the element
 * is for — content no longer accurate — so the meaning survives for a reader who gets
 * no CSS. jk-struck only supplies the colour.
 */
export const Struck = ({ retired, current }: StruckProps) => (
  <>
    <s className="jk-struck">{retired}</s> {current}
  </>
);
