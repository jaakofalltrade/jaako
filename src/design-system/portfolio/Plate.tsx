import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { PLATE_RATIO_CLASS } from "@/constants/ui";
import { AnnotationTone, PlateRatio } from "@/models";
import { cx } from "@/utils/cx";
import { Annotation } from "../core/Annotation";

export type PlateProps = {
  /**
   * Path to the photograph. Omit it and the plate renders a procedural fill instead —
   * see the note on the component below.
   */
  src?: string;
  /**
   * Describe the photograph, not its treatment — "night platform, long exposure",
   * never "duotone plate". Pass decorative instead when the image carries no meaning.
   */
  alt?: string;
  ratio?: PlateRatio;
  /** Left-hand caption: usually a plate number and year. */
  index?: ReactNode;
  /** Right-hand caption: the technical note. Always decorative. */
  spec?: ReactNode;
  /** Purely atmospheric — empties alt and drops it out of the accessibility tree. */
  decorative?: boolean;
  /** Set on the hero plate only. Everything below the fold stays lazy. */
  priority?: boolean;
  /** Responsive hint for next/image. Defaults to the editorial column width. */
  sizes?: string;
  /** Fade-and-settle on scroll. Off for plates that are already visible on load. */
  reveal?: boolean;
  /** 0–360. Shifts the procedural fill so two plates never look identical. */
  seed?: number;
  className?: string;
};

/**
 * A photograph, mapped onto the cyan duotone ramp.
 *
 * The colour work is done by the #jk-duotone SVG filter declared in app/layout.tsx —
 * see styles/tokens/_duotone.scss for why it is a filter and not the usual
 * grayscale + mix-blend-mode trick.
 *
 * With no `src`, the plate falls back to a procedural fill built from the same
 * palette. That is deliberately a permanent feature rather than scaffolding: a project
 * without a photograph should still occupy its slot in the grid at the right ratio and
 * the right temperature, and the fallback keeps the layout honest until real imagery
 * lands. `seed` rotates the gradient so a row of them doesn't repeat.
 *
 * Grain and scanlines are pseudo-elements on the wrapper rather than extra nodes, so a
 * plate is one element in the tree no matter how many layers it appears to have.
 */
export const Plate = ({
  src,
  alt = "",
  ratio = PlateRatio.Portrait,
  index,
  spec,
  decorative = false,
  priority = false,
  sizes = "(min-width: 64rem) 40rem, 100vw",
  reveal = true,
  seed = 0,
  className,
}: PlateProps) => (
  <figure
    aria-hidden={decorative || !src ? true : undefined}
    className={cx("jk-plate", PLATE_RATIO_CLASS[ratio], reveal && "jk-plate-reveal", className)}
    style={seed ? ({ "--plate-seed": `${seed}deg` } as CSSProperties) : undefined}
  >
    {src ? (
      <Image
        src={src}
        alt={decorative ? "" : alt}
        fill
        sizes={sizes}
        priority={priority}
        className="jk-plate__img"
      />
    ) : (
      <span className="jk-plate__proc" />
    )}
    {index || spec ? (
      <figcaption className="jk-plate__caption">
        {index ? <Annotation tone={AnnotationTone.Decorative}>{index}</Annotation> : null}
        {spec ? <Annotation tone={AnnotationTone.Decorative}>{spec}</Annotation> : null}
      </figcaption>
    ) : null}
  </figure>
);
