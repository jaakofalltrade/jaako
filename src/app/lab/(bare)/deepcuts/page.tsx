import type { Metadata } from "next";
import Link from "next/link";
import { routes } from "@/client/endpoints";
import { DEEPCUT_LADDER, DEEPCUT_TIER } from "@/constants";
import { DEEPCUTS_COPY, DEEPCUTS_SPEC, getSamplePack } from "@/data/deepcuts";
import { LAB_APP } from "@/data/lab";
import { LabAppId } from "@/models";
import { PackBoard } from "./PackBoard";
import styles from "./deepcuts.module.scss";

const app = LAB_APP[LabAppId.Deepcuts];

export const metadata: Metadata = {
  title: "deepcuts · lab · jaako andes",
  description: "Rip a pack from my playlist. The fewer plays a song has, the rarer the card.",
};

/**
 * /lab/deepcuts. The shapes, dealing a sample pack.
 *
 * WHAT IS REAL HERE IS THE LAYOUT. The rip works, the fan spreads, the cards turn over
 * worst to best, and every one of them is graded on a rung. What is not real is the
 * data: the pack is a fixture in src/data/deepcuts.ts, no playlist has been read, and
 * no play count has been looked up. The page says so above the pack rather than in a
 * footnote, because a visitor who works that out unaided concludes the whole thing is
 * a mock-up instead of just the numbers.
 *
 * The pack is dealt on the server and handed down as a prop, so the fan is in the HTML
 * before any script runs. Same arrangement as /lab/suggest: the content survives with
 * JavaScript off and only the gesture is lost.
 *
 * The ladder legend stays below the board now that cards can actually be pulled. It
 * reads as a key to a thing on the page rather than as a promise about one, which is
 * the one job it could not do while the pack was sealed.
 */
const DeepcutsPage = () => (
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

    <h1 className={styles.title}>{DEEPCUTS_COPY.title}</h1>
    <p className={styles.subtitle}>{DEEPCUTS_COPY.subtitle}</p>
    <p className={styles.lead}>{DEEPCUTS_COPY.lead}</p>

    <p className={styles.sample}>{DEEPCUTS_COPY.sample_note}</p>

    <PackBoard initialPack={getSamplePack()} />

    <section className={styles.ladder}>
      <h2 className={styles.ladderHead}>{DEEPCUTS_COPY.ladder_label}</h2>
      <p className={styles.ladderNote}>{DEEPCUTS_COPY.ladder_note}</p>

      {/* An ordered list, because the order is the mechanic. A <ul> would say these
          rungs are interchangeable, and the entire app is about which one you landed
          on. */}
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
      <h2 className={styles.rulesHead}>{DEEPCUTS_COPY.spec_label}</h2>

      {/* Written out rather than DefinitionList, as the slots readout is. That
          component carries the site's jk- classes into the global cascade, and a bare
          lab app owns its own type. */}
      <dl className={styles.readout}>
        {DEEPCUTS_SPEC.map(({ term, value }) => (
          <div key={term} className={styles.readoutRow}>
            <dt className={styles.readoutTerm}>{term}</dt>
            <dd className={styles.readoutValue}>{value}</dd>
          </div>
        ))}
      </dl>

      <p className={styles.source}>{DEEPCUTS_COPY.source_note}</p>
    </section>
  </div>
);

export default DeepcutsPage;
