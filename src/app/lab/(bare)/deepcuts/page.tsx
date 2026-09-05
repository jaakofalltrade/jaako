import type { Metadata } from "next";
import Link from "next/link";
import { routes } from "@/client/endpoints";
import { DEEPCUT_LADDER, DEEPCUT_TIER } from "@/constants";
import { DEEPCUTS_TEASER, LAB_APP } from "@/data/lab";
import { LabAppId } from "@/models";
import styles from "./deepcuts.module.scss";

const app = LAB_APP[LabAppId.Deepcuts];

export const metadata: Metadata = {
  title: "deepcuts · lab · jaako andes",
  description: "Rip a pack from my playlist. The fewer plays a song has, the rarer the card. Not built yet.",
};

/**
 * Teaser for /lab/deepcuts. A sealed pack, and a fan of cards nobody has turned over.
 *
 * The real app deals five cards out of a playlist and scores each one on how few
 * plays the track has, so the pull is a track almost nobody listens to. None of that
 * is here and none of it is faked: the pack is shut, the fan is face down, and the
 * only thing on the page that says anything about a card is the ladder legend.
 *
 * Face-down is the whole design decision. A row of mocked-up card faces would be five
 * lies about tracks and tiers that no data has chosen yet, and the first person to
 * open the finished app would find a different five. Backs promise nothing and are
 * still unmistakably a deck.
 *
 * Every card back is the same markup repeated, so the fan is built from an index array
 * rather than from content. That is the one place in this file a bare count lives, and
 * it is a count of shapes on a page rather than a claim about the app.
 *
 * There is no button. Slots keeps a lever that does not move because a cabinet without
 * one is not a cabinet; a pack does not need a control at all, and adding a disabled
 * one would put a dead thing in the tab order for no gain.
 */

/** The fan behind the pack. Positions, not content: every back is identical. */
const FAN = [0, 1, 2, 3, 4];

const DeepcutsTeaserPage = () => (
  <div className={styles.app}>
    <div className={styles.ground} aria-hidden="true" />

    <header className={styles.bar}>
      <Link href={routes.lab.index} className={styles.exit}>
        ←
        <span className={styles.exitLabel}>lab</span>
      </Link>

      <span className={styles.spec} aria-hidden="true">
        {app.index}
      </span>
    </header>

    <h1 className={styles.title}>{DEEPCUTS_TEASER.title}</h1>
    <p className={styles.subtitle}>{DEEPCUTS_TEASER.subtitle}</p>
    <p className={styles.lead}>{DEEPCUTS_TEASER.lead}</p>

    {/* The pack, and the deck behind it. One figure, because the fan is not a separate
        idea from the wrapper sitting in front of it. */}
    <figure className={styles.table}>
      <div className={styles.fan} aria-hidden="true">
        {FAN.map((position) => (
          <span key={position} className={styles.card} data-position={position}>
            <span className={styles.cardBack}>{DEEPCUTS_TEASER.card_back}</span>
          </span>
        ))}
      </div>

      <div className={styles.pack}>
        {/* The strip is the status. It says "tear here" over a pack that does not
            tear, which is the joke, so it is real text and not an aria-hidden
            flourish. */}
        <span className={styles.strip}>
          <span className={styles.stripLabel}>{DEEPCUTS_TEASER.rip_label}</span>
          <span className={styles.stripNote}>{DEEPCUTS_TEASER.rip_note}</span>
        </span>

        <span className={styles.packLabel}>{DEEPCUTS_TEASER.pack_label}</span>

        <span className={styles.packMeta}>
          <span>{DEEPCUTS_TEASER.pack_series}</span>
          <span>{DEEPCUTS_TEASER.pack_count}</span>
        </span>
      </div>

      <figcaption className={styles.fanNote}>{DEEPCUTS_TEASER.fan_note}</figcaption>
    </figure>

    <section className={styles.ladder}>
      <h2 className={styles.ladderHead}>{DEEPCUTS_TEASER.ladder_label}</h2>
      <p className={styles.ladderNote}>{DEEPCUTS_TEASER.ladder_note}</p>

      {/* An ordered list, because the order is the mechanic. A <ul> would say these
          five rungs are interchangeable, and the entire app is about which one you
          landed on. */}
      <ol className={styles.rungs}>
        {DEEPCUT_LADDER.map((tier) => {
          const rung = DEEPCUT_TIER[tier];

          return (
            <li key={tier} className={styles.rung} data-tier={tier}>
              <span className={styles.rungSwatch} aria-hidden="true" />
              <span className={styles.rungLabel}>{rung.label}</span>
              <span className={styles.rungNote}>{rung.note}</span>
            </li>
          );
        })}
      </ol>
    </section>

    <section className={styles.rules}>
      <h2 className={styles.rulesHead}>{DEEPCUTS_TEASER.spec_label}</h2>

      {/* Written out rather than DefinitionList, as the slots readout is. That
          component carries the site's jk- classes into the global cascade, and a bare
          lab app owns its own type. */}
      <dl className={styles.readout}>
        {DEEPCUTS_TEASER.spec.map(({ term, value }) => (
          <div key={term} className={styles.readoutRow}>
            <dt className={styles.readoutTerm}>{term}</dt>
            <dd className={styles.readoutValue}>{value}</dd>
          </div>
        ))}
      </dl>

      <p className={styles.source}>{DEEPCUTS_TEASER.source_note}</p>
    </section>

    <p className={styles.footnote}>{DEEPCUTS_TEASER.footnote}</p>
  </div>
);

export default DeepcutsTeaserPage;
