import { EXPERIENCE } from "@/data/experience";
import { SECTIONS } from "@/data/site";
import { SectionHead } from "../core/SectionHead";
import { ExperienceEntry } from "../portfolio/ExperienceEntry";

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
  </section>
);
