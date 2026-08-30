import type { Metadata } from "next";
import { routes } from "@/client/endpoints";
import { EXPERIENCE, RESEARCH } from "@/data/experience";
import { SECTIONS } from "@/data/site";
import { SectionHead } from "@/design-system/core/SectionHead";
import { BackLink } from "@/design-system/portfolio/BackLink";
import { MastheadBar } from "@/design-system/portfolio/MastheadBar";
import { ExperienceRecord } from "@/design-system/portfolio/ExperienceRecord";

const ROLE_COUNT = EXPERIENCE.reduce((total, item) => total + item.roles.length, 0);

/* Counted rather than written out. The description said "three companies, six titles"
   while the note below computed the same two numbers, so adding a role would have
   updated the page and left the search result behind. */
export const metadata: Metadata = {
  title: "experience · jaako andes",
  description: `${ROLE_COUNT} roles across ${EXPERIENCE.length} companies. Role by role.`,
};

/**
 * The full record.
 *
 * The homepage summarises each company in two or three lines; this is what those lines
 * are short for. Same relationship /work has to the work section, with one difference:
 * there is no per-company route under this one. Restoplus would carry a page worth
 * reading and the other two would carry a sentence each, and three pages of that is a
 * worse answer than one page anyone can scroll.
 *
 * Research sits at the foot rather than in its own section, because it belongs to the
 * same record and there is not enough of it to be a page.
 */
const ExperienceIndexPage = () => (
  <section className="jk-section jk-experience-index">
    <MastheadBar />

    <BackLink href={routes.section({ id: "experience" })}>back to the page</BackLink>

    <SectionHead index={SECTIONS.experience.index} note={`${String(ROLE_COUNT).padStart(2, "0")} roles · 2018–2026`}>
      record
    </SectionHead>

    <div className="jk-experience-index__list">
      {EXPERIENCE.map((item, index) => (
        <ExperienceRecord
          key={item.company}
          item={item}
          index={String(index + 1).padStart(2, "0")}
        />
      ))}
    </div>

    <section className="jk-research" aria-labelledby="research-heading">
      <h3 id="research-heading" className="jk-research__title">
        published
      </h3>
      <ul className="jk-research__list">
        {RESEARCH.map((entry) => (
          <li key={entry.title} className="jk-research__item" data-reveal>
            <p className="jk-research__head">
              {entry.title}
              <span className="jk-research__venue">
                {" "}
                · {entry.venue} · {entry.period}
              </span>
            </p>
            <p className="jk-research__note">{entry.note}</p>
          </li>
        ))}
      </ul>
    </section>
  </section>
);

export default ExperienceIndexPage;
