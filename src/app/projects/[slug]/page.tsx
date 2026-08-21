import { notFound } from "next/navigation";
import Link from "next/link";
import { PROJECT_STATUS_LABEL } from "@/constants/ui";
import { PROJECTS, getProject } from "@/data/projects";
import { BadgeTone, ButtonVariant, IconName } from "@/models";
import { Badge } from "@/design-system/core/Badge";
import { Button } from "@/design-system/core/Button";
import { SectionHeading } from "@/design-system/core/SectionHeading";
import { Window } from "@/design-system/core/Window";
import { Icon } from "@/design-system/Icon";

export const generateStaticParams = () => PROJECTS.map((project) => ({ slug: project.slug }));

const ProjectDetailPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const project = getProject({ slug });
  if (!project) notFound();

  return (
    <Window
      title={`${project.file_name}.md`}
      footer={`${project.year} · ${PROJECT_STATUS_LABEL[project.status]}`}
    >
      <SectionHeading kicker="project">{project.title}</SectionHeading>
      <p className="jk-project-detail__blurb">{project.blurb}</p>
      <div className="jk-project-detail__shot">screenshot goes here</div>
      <div className="jk-project-detail__stack">
        {project.stack.map((entry) => (
          <Badge key={entry} tone={BadgeTone.Steel}>
            {entry}
          </Badge>
        ))}
      </div>
      <div className="jk-project-detail__actions">
        <Link href="/#projects" className="jk-project-detail__link">
          <Button as="span" variant={ButtonVariant.Metal}>
            ← back
          </Button>
        </Link>
        <Button variant={ButtonVariant.Ghost} icon={<Icon name={IconName.Link} size={14} />}>
          source
        </Button>
      </div>
    </Window>
  );
};

export default ProjectDetailPage;
