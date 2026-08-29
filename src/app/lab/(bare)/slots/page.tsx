import type { Metadata } from "next";
import Link from "next/link";
import { routes } from "@/client/endpoints";
import { LAB_APP, SLOTS_TEASER } from "@/data/lab";
import { LabAppId } from "@/models";
import styles from "./slots.module.scss";

const app = LAB_APP[LabAppId.Slots];

export const metadata: Metadata = {
  title: "slot machine · lab · jaako andes",
  description: "Three pulls a day, and a code you can claim. Being wired.",
};

/**
 * Teaser for /lab/slots. A cabinet with the power on and nothing connected.
 *
 * Everything a visitor can reach is inert by construction rather than by a disabled
 * attribute: the lever is a <span>, the reels are three letters, and the only real
 * control on the page is the link out. There is no JavaScript here and no "use
 * client" — a slot machine that cannot be pulled does not need a browser bundle.
 *
 * The look is a deliberate exception to the site's standing rules. This app glows,
 * and the portfolio never will; see docs/lab.md and the header of slots.module.scss.
 *
 * The voucher stub is here at teaser stage on purpose. The prize is the part of this
 * app that is actually interesting, and a cabinet without it just looks like a slot
 * machine that pays nothing.
 */
const SlotsTeaserPage = () => (
  <div className={styles.app}>
    {/* Fixed, behind everything. The site's page ground is two fixed pseudo-elements
        on <body>, and they cannot be reached from a module, so a bare app covers them
        rather than trying to unset them. */}
    <div className={styles.ground} aria-hidden="true" />

    <div className={styles.cabinet}>
      <div className={styles.bulbs} aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} className={styles.bulb} />
        ))}
      </div>

      <h1 className={styles.title}>{SLOTS_TEASER.title}</h1>
      <p className={styles.status}>{SLOTS_TEASER.status}</p>

      <div className={styles.machine}>
        <div className={styles.reels}>
          {SLOTS_TEASER.reels.map((face, position) => (
            <span key={face} className={styles.reel} data-position={position}>
              {face}
            </span>
          ))}
        </div>

        {/* A lever, not a button. Marking it up as a control and disabling it would
            put it in the tab order as a thing that exists but refuses to work. */}
        <div className={styles.lever} aria-hidden="true">
          <span className={styles.leverStem} />
          <span className={styles.leverKnob} />
        </div>
      </div>

      <p className={styles.leverNote}>{SLOTS_TEASER.lever_note}</p>

      <dl className={styles.readout}>
        {SLOTS_TEASER.readout.map(({ term, value }) => (
          <div key={term} className={styles.readoutRow}>
            <dt className={styles.readoutTerm}>{term}</dt>
            <dd className={styles.readoutValue}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>

    <div className={styles.voucher}>
      <p className={styles.voucherLabel}>{SLOTS_TEASER.voucher_label}</p>

      {/* The QR is a flat grid of dead cells, not a real code. Anything scannable here
          would resolve to a claim that cannot be honoured. */}
      <div className={styles.qr} aria-hidden="true">
        {Array.from({ length: 49 }, (_, index) => (
          <span key={index} className={styles.qrCell} data-on={index % 3 === 0} />
        ))}
      </div>

      <p className={styles.voucherCode}>{SLOTS_TEASER.voucher_code}</p>
      <p className={styles.voucherNote}>{SLOTS_TEASER.voucher_note}</p>
    </div>

    <p className={styles.footnote}>{SLOTS_TEASER.footnote}</p>

    <Link href={routes.lab.index} className={styles.exit}>
      ← back to the lab
    </Link>

    <p className={styles.spec}>
      {app.index} · {app.look}
    </p>
  </div>
);

export default SlotsTeaserPage;
