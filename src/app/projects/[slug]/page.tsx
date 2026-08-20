import { notFound } from "next/navigation";
import Link from "next/link";
import { Window } from "@/design-system/core/Window";
import { SectionHeading } from "@/design-system/core/SectionHeading";
import { Badge } from "@/design-system/core/Badge";
import { Button } from "@/design-system/core/Button";
import { Icon } from "@/design-system/Icon";
import { PROJECTS, getProject } from "@/data/projects";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <Window
      title={`${project.title.toLowerCase().replace(/\s+/g, "_")}.md`}
      footer={`${project.year} · ${project.status}`}
    >
      <SectionHeading kicker="project">{project.title}</SectionHeading>
      <p className="jk-project-detail__blurb">{project.blurb}</p>
      <div className="jk-project-detail__shot">screenshot goes here</div>
      <div className="jk-project-detail__stack">
        {project.stack.map((s) => (
          <Badge key={s} tone="steel">
            {s}
          </Badge>
        ))}
      </div>
      <div className="jk-project-detail__actions">
        <Link href="/#projects" className="jk-project-detail__link">
          <Button as="span" variant="metal">
            ← back
          </Button>
        </Link>
        <Button variant="ghost" icon={<Icon name="link" size={14} />}>
          source
        </Button>
      </div>
    </Window>
  );
}
