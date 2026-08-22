"use client";

import { useEffect, useRef, useState } from "react";
import type { Project } from "@/models";
import { cx } from "@/utils/cx";
import { PlateStack } from "./PlateStack";
import { TracklistRow } from "./TracklistRow";

export type TracklistProps = {
  projects: Project[];
  className?: string;
};

/** Below this the plate goes full-bleed behind the list and scroll drives it. */
const MOBILE = "(max-width: 47.9375rem)";

/** Row nearest the vertical centre wins — the same trick the navbar's scroll-spy uses. */
const CENTRE_BAND = "-45% 0px -45% 0px";

/**
 * The work list and its plates.
 *
 * Deliberately React state rather than a CSS `:has()` selector. `:has()` can express
 * "a row is hovered", which covers a pointer and nothing else — and on a phone there
 * is no hover at all. Driving it from state lets the same `active` index be set by
 * three different things: hover, keyboard focus, and scroll position.
 */
export const Tracklist = ({ projects, className }: TracklistProps) => {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const query = window.matchMedia(MOBILE);
    let observer: IntersectionObserver | undefined;

    const attach = () => {
      observer?.disconnect();
      observer = undefined;
      // On a pointer device hover and focus already drive this; a scroll observer on
      // top of them would fight the cursor.
      if (!query.matches) return;

      const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-row]"));
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.find((entry) => entry.isIntersecting);
          if (!visible) return;
          const index = Number(visible.target.getAttribute("data-row"));
          if (!Number.isNaN(index)) setActive(index);
        },
        { rootMargin: CENTRE_BAND, threshold: 0 },
      );
      rows.forEach((row) => observer?.observe(row));
    };

    attach();
    query.addEventListener("change", attach);

    return () => {
      query.removeEventListener("change", attach);
      observer?.disconnect();
    };
  }, [projects.length]);

  return (
    <div className={cx("jk-work", className)}>
      <div ref={listRef} className="jk-work__list">
        {projects.map((project, index) => (
          <div key={project.slug} data-row={index} data-reveal>
            <TracklistRow
              project={project}
              index={String(index + 1).padStart(2, "0")}
              onFocus={() => setActive(index)}
            />
          </div>
        ))}
      </div>
      <PlateStack projects={projects} active={active} className="jk-work__plates" />
    </div>
  );
};
