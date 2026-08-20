import type { CSSProperties } from "react";
import { Window } from "../core/Window";
import { Badge } from "../core/Badge";

export interface ProjectCardProps {
  title: string;
  blurb: string;
  stack?: string[];
  year: string;
  status: string;
  thumb?: string;
  className?: string;
}

export function ProjectCard({
  title,
  blurb,
  stack = [],
  year,
  status,
  thumb,
  className,
}: ProjectCardProps) {
  return (
    <div className={["jk-project-card", className].filter(Boolean).join(" ")}>
      <Window
        title={title.toLowerCase().replace(/\s+/g, "_")}
        footer={
          <span>
            {year} · {status}
          </span>
        }
        padded={false}
        rivets={false}
      >
        {thumb ? (
          <div
            className="jk-project-card__thumb"
            style={{ "--card-thumb": `url(${thumb})` } as CSSProperties}
          />
        ) : null}
        <span aria-hidden="true" className="jk-project-card__stripe" />
        <div className="jk-project-card__body">
          <h3 className="jk-project-card__title">{title}</h3>
          <p className="jk-project-card__blurb">{blurb}</p>
          <div className="jk-project-card__stack">
            {stack.map((s) => (
              <Badge key={s} tone="steel">
                {s}
              </Badge>
            ))}
          </div>
          <span className="jk-project-card__cta">[ open → ]</span>
        </div>
      </Window>
    </div>
  );
}
