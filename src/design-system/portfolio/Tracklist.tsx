import type { Project } from "@/models";
import { cx } from "@/utils/cx";
import { TracklistRow } from "./TracklistRow";

export type TracklistProps = {
  projects: Project[];
  className?: string;
};

/**
 * The work list.
 *
 * A numbered list of rows, and nothing else. The sticky plate panel that used to sit
 * beside it — a stack of every project's photograph, crossfading to whichever row the
 * pointer, the keyboard or the scroll position had landed on — is gone, and the whole
 * apparatus went with it: the PlateStack component, the `active` index, the
 * IntersectionObserver that drove it on small screens, the media-query listener that
 * attached and detached that observer, and the onFocus handler each row carried to
 * feed it. This is a server component now, and so is TracklistRow.
 *
 * A row, not a card. Project cards are the most over-used object on a developer
 * portfolio; a numbered list lets ten projects occupy the space three cards would, and
 * with the plates gone the list gets the full measure to do it in.
 */
export const Tracklist = ({ projects, className }: TracklistProps) => (
  <div className={cx("jk-work", className)}>
    <div className="jk-work__list">
      {projects.map((project, index) => (
        <div key={project.slug} data-reveal>
          <TracklistRow project={project} index={String(index + 1).padStart(2, "0")} />
        </div>
      ))}
    </div>
  </div>
);
