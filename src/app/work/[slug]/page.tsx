import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE } from "@/constants/ui";
import { PROJECTS, getProject } from "@/data/projects";
import { AnnotationTone, ButtonVariant, IconName, PlateRatio } from "@/models";
import { Annotation } from "@/design-system/core/Annotation";
import { Badge } from "@/design-system/core/Badge";
import { Button } from "@/design-system/core/Button";
import { DefinitionList } from "@/design-system/core/DefinitionList";
import { Rule } from "@/design-system/core/Rule";
import { BackLink } from "@/design-system/portfolio/BackLink";
import { Plate } from "@/design-system/portfolio/Plate";
import { Icon } from "@/design-system/Icon";

export const generateStaticParams = () => PROJECTS.map((project) => ({ slug: project.slug }));

export const generateMetadata = async (args: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> => {
  const { slug } = await args.params;
  const project = getProject({ slug });
  if (!project) return {};

  return {
    title: `${project.title} · jaako andes`,
    description: project.blurb,
  };
};

/**
 * One project: a plate, then a short case note.
 *
 * No screenshots by design. Half of these are a Discord bot, a metronome and internal
 * tooling — things with nothing worth photographing — and a page that promises a
 * screenshot and shows a placeholder is worse than one that never offered.
 */
const ProjectDetailPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const project = getProject({ slug });
  if (!project) notFound();

  const index = PROJECTS.findIndex((entry) => entry.slug === slug) + 1;
  const plateIndex = String(index).padStart(2, "0");

  return (
    <article className="jk-section jk-detail">
      <BackLink href="/work">full index</BackLink>

      <Plate
        src={project.plate}
        ratio={PlateRatio.Landscape}
        priority
        reveal={false}
        decorative
        seed={index * 47}
        sizes="(min-width: 64rem) 64rem, 100vw"
        index={`plate ${plateIndex}`}
        spec={`${project.year} · duotone c-2`}
        className="jk-detail__plate"
      />

      <header className="jk-detail__head">
        <Annotation tone={AnnotationTone.Decorative}>{plateIndex}</Annotation>
        <h1 className="jk-detail__title">{project.title}</h1>
        <Rule draw />
        <Badge tone={PROJECT_STATUS_TONE[project.status]}>
          {PROJECT_STATUS_LABEL[project.status]}
        </Badge>
      </header>

      <div className="jk-detail__grid">
        <div className="jk-detail__body">
          <p className="jk-detail__blurb" data-reveal>
            {project.blurb}
          </p>
          <p className="jk-detail__note" data-reveal data-delay="1">
            {project.case_note}
          </p>
        </div>

        <DefinitionList
          ruled
          className="jk-detail__meta"
          items={[
            { term: "year", value: project.year },
            { term: "status", value: PROJECT_STATUS_LABEL[project.status] },
            { term: "stack", value: project.stack.join(" · ") },
          ]}
        />
      </div>

      <div className="jk-detail__actions">
        <Button variant={ButtonVariant.Ghost} icon={<Icon name={IconName.Link} size={14} />}>
          source
        </Button>
      </div>
    </article>
  );
};

export default ProjectDetailPage;
