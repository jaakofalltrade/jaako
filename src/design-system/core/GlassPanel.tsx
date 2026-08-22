import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "@/utils/cx";

export type GlassPanelProps = HTMLAttributes<HTMLDivElement> & {
  /** Alpha of the frost. Continuous, so it rides in as a custom property. */
  tint?: number;
  hoverLift?: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * Frosted glass. Frosted, not glossy.
 *
 * The `specular` prop is gone. It painted a diagonal band of light across the pane,
 * which is the single strongest "polished surface" cue there is and the opposite of
 * where this design went. What is left is a flat translucent fill, one hairline, and
 * the ground going soft behind it — the finish comes from the blur, not from a
 * reflection drawn on the front.
 *
 * Still budgeted, because backdrop-filter is the most expensive thing here and it is
 * permanently composited: the section nav, the instrument strip, the hero slab, the
 * player, the contact block, the mobile work list, and buttons. Before adding
 * another, check that it actually overlays the photograph. If it does not, it wants a
 * hairline instead.
 */
export const GlassPanel = ({
  tint,
  hoverLift = false,
  className,
  children,
  ...rest
}: GlassPanelProps) => (
  <div
    className={cx("jk-glass", hoverLift && "jk-glass--hover-lift", className)}
    style={tint === undefined ? undefined : ({ "--glass-alpha": tint } as CSSProperties)}
    {...rest}
  >
    {children}
  </div>
);
