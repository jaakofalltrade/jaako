import { cx } from "@/utils/cx";

export type RuleProps = {
  /** Draws itself left-to-right when scrolled into view. */
  draw?: boolean;
  /** A small filled square at the left end — the editorial "start here" mark. */
  tick?: boolean;
  /** Brighter, cyan-tinted. For rules that separate sections rather than fields. */
  lit?: boolean;
  className?: string;
};

/**
 * A hairline.
 *
 * Load-bearing: with the window/panel metaphor gone, rules are the only thing
 * dividing the page, so this is the most-used component in the design system.
 * Always decorative — never announced.
 */
export const Rule = ({ draw = false, tick = false, lit = false, className }: RuleProps) => (
  <span aria-hidden="true" className={cx("jk-rule-wrap", className)}>
    {tick ? <span className="jk-rule__tick" /> : null}
    <span className={cx("jk-rule", lit && "jk-rule--lit", draw && "jk-rule--draw")} />
  </span>
);
