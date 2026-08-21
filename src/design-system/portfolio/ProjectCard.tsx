import type { CSSProperties } from "react";
import { PROJECT_STATUS_LABEL } from "@/constants/ui";
import { BadgeTone } from "@/models";
import type { Project } from "@/models";
import { cx } from "@/utils/cx";
import { Badge } from "../core/Badge";
import { Window } from "../core/Window";

export type ProjectCardProps = Project & {
  thumb?: string;
  className?: string;
};

export const ProjectCard = ({
  title,
  file_name,
  blurb,
  stack,
  year,
  status,
  thumb,
  className,
}: ProjectCardProps) => (
  <div className={cx("jk-project-card", className)}>
    <Window
      title={file_name}
      footer={
        <span>
          {year} · {PROJECT_STATUS_LABEL[status]}
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
          {stack.map((entry) => (
            <Badge key={entry} tone={BadgeTone.Steel}>
              {entry}
            </Badge>
          ))}
        </div>
        <span className="jk-project-card__cta">[ open → ]</span>
      </div>
    </Window>
  </div>
);
