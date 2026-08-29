import Link from "next/link";
import { FEATURED_PROJECTS, PROJECTS } from "@/data/projects";
import { SECTIONS } from "@/data/site";
import { SectionHead } from "../core/SectionHead";
import { Tracklist } from "../portfolio/Tracklist";

/**
 * The homepage shows the curated few. Everything lives on /work — which is what gives
 * the numbered list somewhere real to point, rather than the index stopping at three.
 */
export const WorkSection = () => (
  <section id="work" className="jk-section jk-work-section">
    <SectionHead index={SECTIONS.work.index} note={`${FEATURED_PROJECTS.length} of ${PROJECTS.length}`}>
      {SECTIONS.work.title}
    </SectionHead>

    <Tracklist projects={FEATURED_PROJECTS} />

    <Link href="/work" className="jk-section__all">
      full index · {PROJECTS.length} entries →
    </Link>
  </section>
);
