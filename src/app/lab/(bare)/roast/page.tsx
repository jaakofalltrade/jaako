import type { Metadata } from "next";
import Link from "next/link";
import { routes } from "@/client/endpoints";
import { LAB_APP, ROAST_TEASER } from "@/data/lab";
import { LabAppId } from "@/models";
import styles from "./roast.module.scss";

const app = LAB_APP[LabAppId.Roast];

export const metadata: Metadata = {
  title: "spotify roast · lab · jaako andes",
  description: "An agent reads your listening history and is not kind about it. Not built yet.",
};

/**
 * Teaser for /lab/roast. A chat client that is not connected to anything.
 *
 * The real app streams: the agent's lines arrive one at a time from a route handler,
 * and the pauses between them are the joke's timing rather than a loading state. None
 * of that is here. These four bubbles are static markup, delivered all at once, and
 * the typing indicator underneath them never resolves into anything.
 *
 * That last part is the teaser. An indicator that has been thinking since the day the
 * page shipped says more about the state of this app than a banner would, and it is
 * the one piece of the final design that works better broken than finished.
 *
 * The composer is a <p>, not an <input>. A real field would invite a reply that has
 * nowhere to go, and disabling it would put a dead control in the tab order.
 */
const RoastTeaserPage = () => (
  <div className={styles.app}>
    <div className={styles.ground} aria-hidden="true" />

    <div className={styles.phone}>
      <header className={styles.bar}>
        <Link href={routes.lab.index} className={styles.exit}>
          ←
          <span className={styles.exitLabel}>lab</span>
        </Link>

        <span className={styles.who}>
          <span className={styles.title}>{ROAST_TEASER.title}</span>
          <span className={styles.subtitle}>{ROAST_TEASER.subtitle}</span>
        </span>

        <span className={styles.spec} aria-hidden="true">
          {app.index}
        </span>
      </header>

      <div className={styles.thread}>
        {ROAST_TEASER.lines.map((line) => (
          <p key={line} className={styles.bubble}>
            {line}
          </p>
        ))}

        {/* Permanently mid-thought. The label is read out; the three dots are the
            same statement in the form the design actually wants. */}
        <p className={styles.typing}>
          <span className={styles.dots} aria-hidden="true">
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </span>
          <span className={styles.typingLabel}>{ROAST_TEASER.typing_label}</span>
        </p>
      </div>

      <p className={styles.composer}>{ROAST_TEASER.composer_placeholder}</p>
    </div>

    <p className={styles.seats}>{ROAST_TEASER.seats_note}</p>
  </div>
);

export default RoastTeaserPage;
