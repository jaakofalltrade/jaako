"use client";

import { useState } from "react";
import { DEEPCUT_LADDER, DEEPCUT_TIER, DEEPCUT_TIER_FLOOR } from "@/constants";
import { DEEPCUTS_TEASER } from "@/data/lab";
import { Tabs } from "@/design-system/core/Tabs";
import styles from "./deepcuts.module.scss";

/**
 * The legend and the rules, as two tabs above the shelf.
 *
 * THEY USED TO BE TWO STACKED SECTIONS BELOW THE PACKS, and moving them up meant
 * folding them together: two full blocks of explanation between the masthead and the
 * thing being explained would have pushed the shelf off the first screen entirely. A
 * tab strip is one block tall and holds both.
 *
 * THE LEGEND IS THE DEFAULT TAB AND THAT IS THE WHOLE ORDERING DECISION. The one thing
 * a visitor cannot guess about this app is that the rarity runs backwards, and the
 * ladder is what says so. The rules are the small print.
 *
 * The floors are printed on the legend now, which they were not when they were
 * undecided. They are a formula rather than five invented bands - one order of
 * magnitude per rung - and a legend that shows the numbers is what lets somebody check
 * a card against it. See src/utils/rarity.ts.
 */
export const RulesTabs = () => {
  /* Typed as a plain string rather than inferred. DEEPCUTS_TEASER is `as const`, so the
     inferred state type would be the literal "legend" and setting it to the rules tab
     would not typecheck. */
  const [tab, setTab] = useState<string>(DEEPCUTS_TEASER.tab_legend_id);

  const legend = (
    <>
      {/* The inversion, said once in words. The order of the rungs cannot carry it on
          its own: a ladder printed commonest-first looks like every other rarity ladder,
          and every other rarity ladder means the opposite of this one. */}
      <p className={styles.ladderNote}>{DEEPCUTS_TEASER.ladder_note}</p>

      {/* An ordered list, because the order is the mechanic. A <ul> would say these five
          rungs are interchangeable, and the entire app is about which one you landed
          on. */}
      <ol className={styles.rungs}>
        {DEEPCUT_LADDER.map((tier) => {
          const rung = DEEPCUT_TIER[tier];
          const floor = DEEPCUT_TIER_FLOOR[tier];

          return (
          <li key={tier} className={styles.rung} data-tier={tier}>
            <span className={styles.rungSwatch} aria-hidden="true" />
            <span className={styles.rungLabel}>{rung.label}</span>

            {/* The band, in plays. "under 10,000" for the rarest rung rather than
                "0 plays and up", which is arithmetically the same and reads backwards:
                the top of this ladder is defined by how FEW plays a track has. */}
            <span className={styles.rungPlays}>
              {floor === 0
                ? `${DEEPCUTS_TEASER.rung_under} ${DEEPCUT_TIER_FLOOR[DEEPCUT_LADDER[DEEPCUT_LADDER.length - 2]].toLocaleString()}`
                : `${floor.toLocaleString()}+`}
            </span>

            <span className={styles.rungNote}>{rung.note}</span>
          </li>
          );
          })}
      </ol>
    </>
  );

  const rules = (
    <>
      {/* Written out rather than DefinitionList, as the slots readout is. That component
          carries the site's jk- classes into the global cascade, and a bare lab app owns
          its own type. */}
      <dl className={styles.readout}>
        {DEEPCUTS_TEASER.spec.map(({ term, value }) => (
          <div key={term} className={styles.readoutRow}>
            <dt className={styles.readoutTerm}>{term}</dt>
            <dd className={styles.readoutValue}>{value}</dd>
          </div>
        ))}
      </dl>

      <p className={styles.source}>{DEEPCUTS_TEASER.source_note}</p>
    </>
  );

  return (
    <div className={styles.explain}>
      <Tabs
        items={[
          { id: DEEPCUTS_TEASER.tab_legend_id, label: DEEPCUTS_TEASER.tab_legend, panel: legend },
          { id: DEEPCUTS_TEASER.tab_rules_id, label: DEEPCUTS_TEASER.tab_rules, panel: rules },
        ]}
        value={tab}
        onChange={setTab}
        label={DEEPCUTS_TEASER.tabs_label}
        classNames={{
          list: styles.tabList,
          tab: styles.tab,
          panel: styles.tabPanel,
        }}
      />
    </div>
  );
};
