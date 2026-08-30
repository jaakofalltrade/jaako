import type { Metadata } from "next";
import Link from "next/link";
import { routes } from "@/client/endpoints";
import { LAB_STATUS_BADGE } from "@/constants";
import { LAB_APPS, LAB_INTRO } from "@/data/lab";
import { AnnotationTone } from "@/models";
import { Annotation } from "@/design-system/core/Annotation";
import { Badge } from "@/design-system/core/Badge";
import { SectionHead } from "@/design-system/core/SectionHead";
import { BackLink } from "@/design-system/portfolio/BackLink";
import { MastheadBar } from "@/design-system/portfolio/MastheadBar";
import styles from "./lab.module.scss";

export const metadata: Metadata = {
  title: "lab · jaako andes",
  description: "Things that are not a portfolio. A slot machine, a shared playlist, and an agent with opinions.",
};

/**
 * The index.
 *
 * Built from the components the rest of the site is built from, on purpose. The three
 * apps look like nothing else here and like nothing like each other, so the room they
 * are listed in has to be the calm one. A lobby that was already shouting would leave
 * the apps nowhere to go.
 *
 * The numbering is the same editorial device as /work, and it carries the same
 * promise: this is a catalogue, and it is complete. Adding a fourth app means adding
 * a row to src/data/lab.ts, and this page needs no edit at all.
 *
 * Each row used to name its own art direction under the blurb - "looks like: arcade
 * CRT". It was a caption on a link that is not a picture, and three of them stacked
 * down the page turned a list into a specification sheet. The lead says the same thing
 * once, in a sentence, which is where it belongs.
 *
 * The rows read exactly like the ones on /work, down to the hover: this is a numbered
 * catalogue of things you can open, and so is that. Two list treatments for one idea
 * was the sloppiness.
 */
const LabIndexPage = () => (
  <section className="jk-section">
    <MastheadBar />

    <BackLink href={routes.home}>back to the portfolio</BackLink>

    <SectionHead index={LAB_INTRO.index} note={LAB_INTRO.note}>
      {LAB_INTRO.title}
    </SectionHead>

    <p className={styles.lead} data-reveal>
      {LAB_INTRO.lead}
    </p>

    <ul className={styles.list}>
      {LAB_APPS.map((app, position) => {
        const badge = LAB_STATUS_BADGE[app.status];

        return (
          <li key={app.id} className={styles.row} data-reveal data-delay={position}>
            <Link href={app.href} className={styles.link}>
              <span className={styles.index} aria-hidden="true">
                {app.index}
              </span>

              <span className={styles.head}>
                <span className={styles.name}>{app.name}</span>
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </span>

              <span className={styles.blurb}>{app.blurb}</span>
            </Link>
          </li>
        );
      })}
    </ul>

    <Annotation tone={AnnotationTone.Info} className={styles.aside}>
      {LAB_INTRO.aside}
    </Annotation>
  </section>
);

export default LabIndexPage;
