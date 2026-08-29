import Link from "next/link";
import { routes } from "@/client/endpoints";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE } from "@/constants";
import { ProjectStatus } from "@/models";
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
  <Link
    href={routes.project({ slug: project.slug })}
    className="jk-track"
    /* Retired work reads one step back from the rest of the list. The badge already
       says "archived" and the badge is still the carrier — this is the same fact at
       the scale of the row, so an archived entry is recognisable while scanning the
       column of titles rather than only when the eye reaches the right-hand edge.

       A data attribute rather than a modifier class because it is a state of the
       project and not a variant of the row, and because it keeps the styling honest:
       there is exactly one status that dims, and _tracklist.scss can only reach it
       through the one selector. */
    data-archived={project.status === ProjectStatus.Archived ? "" : undefined}
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
