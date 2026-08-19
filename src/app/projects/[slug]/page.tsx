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
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          lineHeight: "var(--leading-normal)",
          maxWidth: "62ch",
        }}
      >
        {project.blurb}
      </p>
      <div
        style={{
          height: 220,
          margin: "var(--space-5) 0",
          background: "var(--panel-gradient-dark)",
          backgroundImage: "var(--scanlines), var(--panel-gradient-dark)",
          border: "var(--border-1) solid var(--steel-400)",
          boxShadow: "var(--inset-well)",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-pixel-micro)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "var(--tracking-caps)",
          color: "var(--piss-300)",
        }}
      >
        screenshot goes here
      </div>
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-6)" }}>
        {project.stack.map((s) => (
          <Badge key={s} tone="steel">
            {s}
          </Badge>
        ))}
      </div>
      <div style={{ display: "flex", gap: "var(--space-4)" }}>
        <Link href="/#projects" style={{ textDecoration: "none" }}>
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
