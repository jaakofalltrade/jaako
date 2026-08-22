import type { ReactNode } from "react";
import { ANNOTATION_TONE_CLASS } from "@/constants/ui";
import { AnnotationTone } from "@/models";
import { cx } from "@/utils/cx";

export type AnnotationProps = {
  tone?: AnnotationTone;
  className?: string;
  children?: ReactNode;
};

/**
 * The mono micro-label: ref codes, coordinates, counts, timestamps.
 *
 * This component exists to enforce an accessibility rule rather than to save markup.
 * The design's signature is very small tracked caps, which is also the thing most
 * likely to fail an audit, so the two cases are separated in the type system:
 *
 *   Info        --text-dim, 4.69:1 at worst, stays in the accessibility tree.
 *   Decorative  --text-faint, 3.31:1 — fails WCAG AA for text — so it is also
 *               aria-hidden. Texture only: plate numbers, ref codes, coordinates.
 *
 * If a reader would miss something by not hearing it, it is Info. The floor for both
 * is --text-3xs (10px); nothing in this design goes below that.
 */
export const Annotation = ({
  tone = AnnotationTone.Info,
  className,
  children,
}: AnnotationProps) => (
  <span
    // Decorative annotation is below the contrast threshold, so it must not be the
    // only carrier of anything — hiding it keeps that honest.
    aria-hidden={tone === AnnotationTone.Decorative ? true : undefined}
    className={cx("jk-anno", ANNOTATION_TONE_CLASS[tone], className)}
  >
    {children}
  </span>
);
