import Link from "next/link";
import { routes } from "@/client/endpoints";
import { EXPERIENCE } from "@/data/experience";
import { SECTIONS } from "@/data/site";
import { SectionHead } from "../core/SectionHead";
import { ExperienceEntry } from "../portfolio/ExperienceEntry";

/**
 * The homepage shows each company summarised. The full record, role by role, lives on
 * /experience — which is what keeps a six-year tenure from pushing the work and contact
 * sections off the bottom of the page.
 *
 * Same arrangement as WorkSection: the short form, then one link out. Not a link per
 * entry, which would put the same affordance three times in a section this short, twice
 * pointing at a job that is one sentence long.
 */
export const ExperienceSection = () => (
  <section id="experience" className="jk-section jk-experience">
    <SectionHead
      index={SECTIONS.experience.index}
      note={`${String(EXPERIENCE.length).padStart(2, "0")} entries`}
    >
      {SECTIONS.experience.title}
    </SectionHead>

    <div className="jk-experience__list">
      {EXPERIENCE.map((item, index) => (
        <ExperienceEntry
          key={item.company}
          item={item}
          index={String(index + 1).padStart(2, "0")}
        />
      ))}
    </div>

    <Link href={routes.experience} className="jk-section__all">
      full history · {EXPERIENCE.length} entries →
    </Link>
  </section>
);
