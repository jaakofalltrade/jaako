import Link from "next/link";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE } from "@/constants/ui";
import type { Project } from "@/models";
import { Badge } from "../core/Badge";

export type TracklistRowProps = {
  project: Project;
  /** Two-digit index — the tracklist's spine. */
  index: string;
};

/**
 * One row of the work tracklist.
 *
 * A row, not a card. Project cards are the most over-used object on a developer
 * portfolio; a numbered list lets ten projects occupy the space three cards would.
 *
 * It used to take an onFocus callback, fired on hover and on keyboard focus alike, to
 * raise this project's plate in the panel beside the list. The panel is gone, so the
 * callback is too — and with no handlers left this is a server component, not a client
 * one. The row's own hover treatment was always CSS.
 */
export const TracklistRow = ({ project, index }: TracklistRowProps) => (
  <Link href={`/work/${project.slug}`} className="jk-track">
    <span aria-hidden="true" className="jk-track__index">
      {index}
    </span>

    <span className="jk-track__body">
      <span className="jk-track__title">{project.title}</span>
      <span className="jk-track__blurb">{project.blurb}</span>
    </span>

    <span className="jk-track__meta">
      <span className="jk-track__stack">
        {project.stack.join(" · ")} · {project.year}
      </span>
      <Badge tone={PROJECT_STATUS_TONE[project.status]}>
        {PROJECT_STATUS_LABEL[project.status]}
      </Badge>
    </span>
  </Link>
);
