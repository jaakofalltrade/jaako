import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

export type DefinitionItem = {
  term: string;
  value: ReactNode;
};

export type DefinitionListProps = {
  items: DefinitionItem[];
  /** Rules under each row. Used where the list is a panel rather than an inline aside. */
  ruled?: boolean;
  className?: string;
};

/**
 * The term/value metadata block — role, location, tenure, stack, coordinates.
 *
 * Written out by hand in four places before this existed. A real <dl> rather than a
 * grid of spans, because the pairing is the meaning: a screen reader should say
 * "role, technical lead", not read two unrelated fragments.
 */
export const DefinitionList = ({ items, ruled = false, className }: DefinitionListProps) => (
  <dl className={cx("jk-dl", ruled && "jk-dl--ruled", className)}>
    {items.map(({ term, value }) => (
      // The fragment keeps each dt/dd adjacent, which is what makes the pairing
      // survive — a wrapper <div> around each pair would break the dl semantics.
      <div key={term} className="jk-dl__row">
        <dt className="jk-dl__term">{term}</dt>
        <dd className="jk-dl__value">{value}</dd>
      </div>
    ))}
  </dl>
);
