import { PlateRatio } from "@/models";
import type { Project } from "@/models";
import { cx } from "@/utils/cx";
import { Plate } from "./Plate";

export type PlateStackProps = {
  projects: Project[];
  /** Index of the plate currently raised. */
  active: number;
  className?: string;
};

/**
 * The plates that answer to the tracklist.
 *
 * All of them are rendered and stacked; only opacity changes. Mounting and unmounting
 * instead would restart each image's decode on every hover, which is exactly the
 * stutter this is trying to avoid.
 *
 * Wholly decorative — the tracklist beside it already carries every title, so
 * announcing the plates again would just duplicate the list for a screen reader.
 */
export const PlateStack = ({ projects, active, className }: PlateStackProps) => (
  <div aria-hidden="true" className={cx("jk-platestack", className)}>
    {projects.map((project, index) => (
      <Plate
        key={project.slug}
        src={project.plate}
        ratio={PlateRatio.Portrait}
        decorative
        reveal={false}
        seed={index * 47}
        sizes="(min-width: 64rem) 20rem, 100vw"
        index={`plate ${String(index + 1).padStart(2, "0")}`}
        spec={project.year}
        className={cx("jk-platestack__item", index === active && "jk-platestack__item--on")}
      />
    ))}
  </div>
);
