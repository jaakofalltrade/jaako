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
 * Each row names its own art direction under the title. That is the one piece of
 * information a visitor cannot get from anywhere else on this page, and it is what
 * turns three links into an invitation to open all three.
 */
const LabIndexPage = () => (
  <section className="jk-section">
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

              {/* Not an Annotation: that component is for the page's own texture, and
                  this line is part of the link's accessible name. */}
              <span className={styles.look}>looks like: {app.look}</span>
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
