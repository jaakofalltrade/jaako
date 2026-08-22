import type { CSSProperties } from "react";
import { ICON_SRC } from "@/constants/ui";
import { IconName } from "@/models";
import { cx } from "@/utils/cx";

export type IconProps = {
  name: IconName;
  size?: number;
  spin?: boolean;
  className?: string;
};

/**
 * Lucide SVGs from public/icons, recoloured by --icon-tint to sit in the palette.
 *
 * The path comes out of a lookup rather than being interpolated from the name —
 * an unknown icon is now a type error instead of a 404, and nothing a caller
 * passes can reach the src attribute unmediated.
 */
export const Icon = ({ name, size = 18, spin = false, className }: IconProps) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={ICON_SRC[name]}
    alt=""
    width={size}
    height={size}
    data-spin={spin ? "" : undefined}
    className={cx("jk-icon", className)}
    style={{ "--icon-size": `${size}px` } as CSSProperties}
  />
);
