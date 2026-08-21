import { EXPERIENCE } from "@/data/experience";
import { PanelTone } from "@/models";
import { SectionHeading } from "../core/SectionHeading";
import { Window } from "../core/Window";
import { ExperienceEntry } from "../portfolio/ExperienceEntry";

export const ExperienceSection = () => (
  <section id="experience" className="jk-experience-section">
    <Window
      title="career.log"
      tone={PanelTone.Void}
      controls={false}
      footer="promoted 3x, still answers to the printers"
    >
      <SectionHeading kicker="02 / experience" rule={false}>
        Where I&apos;ve worked
      </SectionHeading>
      <div className="jk-experience-section__list">
        {EXPERIENCE.map((entry) => (
          <ExperienceEntry key={entry.company} {...entry} />
        ))}
      </div>
    </Window>
  </section>
);
