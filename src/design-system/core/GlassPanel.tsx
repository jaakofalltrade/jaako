import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "@/utils/cx";

export type GlassPanelProps = HTMLAttributes<HTMLDivElement> & {
  specular?: boolean;
  /** Alpha of the smoked-glass tint. Continuous, so it rides in as a custom property. */
  tint?: number;
  hoverLift?: boolean;
  hazardEdge?: boolean;
  className?: string;
  children?: ReactNode;
};

export const GlassPanel = ({
  specular = true,
  tint,
  hoverLift = false,
  hazardEdge = false,
  className,
  children,
  ...rest
}: GlassPanelProps) => (
  <div
    className={cx(
      "jk-glass",
      specular && "jk-glass--specular",
      hoverLift && "jk-glass--hover-lift",
      hazardEdge && "jk-glass--hazard-edge",
      className,
    )}
    style={tint === undefined ? undefined : ({ "--glass-alpha": tint } as CSSProperties)}
    {...rest}
  >
    {children}
  </div>
);
