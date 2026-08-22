"use client";

import Link from "next/link";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE } from "@/constants/ui";
import type { Project } from "@/models";
import { Badge } from "../core/Badge";

export type TracklistRowProps = {
  project: Project;
  /** Two-digit index — the tracklist's spine. */
  index: string;
  /** Raises this row's plate in the sticky panel beside the list. */
  onFocus: () => void;
};

/**
 * One row of the work tracklist.
 *
 * A row, not a card. Project cards are the most over-used object on a developer
 * portfolio; a numbered list with a plate that answers to it is the Aphex sleeve, and
 * it lets ten projects occupy the space three cards would.
 *
 * onFocus fires on hover *and* on keyboard focus, so the plate follows a Tab traversal
 * exactly as it follows the pointer.
 */
export const TracklistRow = ({ project, index, onFocus }: TracklistRowProps) => (
  <Link
    href={`/work/${project.slug}`}
    className="jk-track"
    onMouseEnter={onFocus}
    onFocus={onFocus}
  >
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
