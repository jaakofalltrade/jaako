"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { DEEPCUT_LADDER, DEEPCUT_TIER, DEEPCUT_TIER_FLOOR } from "@/constants";
import { DEEPCUTS_TEASER } from "@/data/lab";
import { Tabs } from "@/design-system/core/Tabs";
import { CardGallery } from "./CardGallery";
import { Collection } from "./Collection";
import styles from "./deepcuts.module.scss";

/**
 * The legend and the rules, as two tabs above the shelf.
 *
 * THEY USED TO BE TWO STACKED SECTIONS BELOW THE PACKS, and moving them up meant
 * folding them together: two full blocks of explanation between the masthead and the
 * thing being explained would have pushed the shelf off the first screen entirely. A
 * tab strip is one block tall and holds both.
 *
 * FIVE TABS NOW, AND THE PACKS ARE ONE OF THEM. The shelf used to sit below this block
 * as its own section; it is the first tab instead, and the default. What that buys is a
 * page that fits: a masthead, one strip, and one thing under it, rather than four
 * stacked blocks a reader has to scroll past to reach the subject.
 *
 * The order is the reading order. The packs are what the page is; the legend says what
 * the rungs on them mean; the cards show what one looks like; the rules are the small
 * print behind all three.
 *
 * The floors are printed on the legend now, which they were not when they were
 * undecided. They are quantiles of the account's measured catalogue, rounded to numbers
 * a legend can print, and a legend that shows them is what lets somebody check a card
 * against it. See DEEPCUT_TIER_FLOOR for the measurement and `pnpm ladder:spread` for
 * the script that took it.
 */
export type RulesTabsProps = {
  /**
   * The shelf of packs, rendered on the server and handed down as an element.
   *
   * A PROP RATHER THAN AN IMPORT, because the shelf is an async server component reading
   * Spotify and this file is a client component holding tab state. An element can cross
   * that boundary; the component that produces it cannot. The page builds it, wraps it
   * in its own Suspense boundary, and passes the result through.
   */
  packs: ReactNode;
};

export const RulesTabs = ({ packs }: RulesTabsProps) => {
  /* Typed as a plain string rather than inferred. DEEPCUTS_TEASER is `as const`, so the
     inferred state type would be the literal "legend" and setting it to the rules tab
     would not typecheck. */
  /* THE PACKS ARE THE DEFAULT, and that reverses an earlier call. The legend opened
     first on the argument that the one thing a visitor cannot guess is that rarity runs
     backwards. That was right when the tabs sat above a shelf which was itself on
     screen; now the shelf is inside them, and opening on an explanation of a thing the
     reader cannot see is the wrong way round. The legend is one click away and the
     lead paragraph above already states the inversion. */
  const [tab, setTab] = useState<string>(DEEPCUTS_TEASER.tab_packs_id);

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
          { id: DEEPCUTS_TEASER.tab_packs_id, label: DEEPCUTS_TEASER.tab_packs, panel: packs },
          { id: DEEPCUTS_TEASER.tab_legend_id, label: DEEPCUTS_TEASER.tab_legend, panel: legend },
          /* Between the legend and the rules on purpose. The legend says what a rung
             means, the cards say what one looks like, and the rules are the small print
             behind both. */
          { id: DEEPCUTS_TEASER.tab_cards_id, label: DEEPCUTS_TEASER.tab_cards, panel: <CardGallery /> },
          /* And straight after the set, because the only difference between them is
             whose: one is every card that exists, the next is the ones you have. Reading
             them in that order is what makes the second one mean anything.

             `active` is passed rather than the panel being unmounted, because Tabs keeps
             every panel mounted - see the pager it was changed for - so this is how the
             binder knows to re-read after somebody has been off opening a pack. */
          {
            id: DEEPCUTS_TEASER.tab_collection_id,
            label: DEEPCUTS_TEASER.tab_collection,
            panel: <Collection active={tab === DEEPCUTS_TEASER.tab_collection_id} />,
          },
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
