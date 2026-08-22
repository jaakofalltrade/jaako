import type { Metadata } from "next";
import { PROJECTS } from "@/data/projects";
import { SECTIONS } from "@/data/site";
import { SectionHead } from "@/design-system/core/SectionHead";
import { Tracklist } from "@/design-system/portfolio/Tracklist";

export const metadata: Metadata = {
  title: "work · jaako andes",
  description: "Everything, numbered. Discord bots, ordering platforms and a metronome.",
};

/**
 * The full index.
 *
 * The homepage shows a curated few; this is the catalogue the numbering implies. Same
 * Tracklist component, unfiltered — an index that looked different from the excerpt
 * would undo the point of numbering them in the first place.
 */
const WorkIndexPage = () => (
  <section className="jk-section jk-work-index">
    <SectionHead
      index={SECTIONS.work.index}
      note={`${String(PROJECTS.length).padStart(2, "0")} entries · 2019–2026`}
    >
      index
    </SectionHead>

    <Tracklist projects={PROJECTS} />
  </section>
);

export default WorkIndexPage;
