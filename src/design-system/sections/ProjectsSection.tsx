import Link from "next/link";
import { PROJECTS } from "@/data/projects";
import { SectionHeading } from "../core/SectionHeading";
import { ProjectCard } from "../portfolio/ProjectCard";

export const ProjectsSection = () => (
  <section id="projects" className="jk-projects">
    <div className="jk-projects__panel">
      <SectionHeading kicker="03 / projects" rule={false}>
        Projects
      </SectionHeading>
      <div className="jk-projects__grid">
        {PROJECTS.map((project) => (
          <Link
            key={project.slug}
            href={`/projects/${project.slug}`}
            className="jk-projects__link"
          >
            <ProjectCard {...project} />
          </Link>
        ))}
      </div>
    </div>
  </section>
);
