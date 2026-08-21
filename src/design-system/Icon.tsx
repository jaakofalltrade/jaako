import type { CSSProperties } from "react";

export interface IconProps {
  name: string;
  size?: number;
  spin?: boolean;
  className?: string;
}

/** Lucide SVGs from public/icons, tinted to sit in the piss-filter palette. */
export function Icon({ name, size = 18, spin = false, className }: IconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/${name}.svg`}
      alt=""
      width={size}
      height={size}
      data-spin={spin ? "" : undefined}
      className={["jk-icon", className].filter(Boolean).join(" ")}
      style={{ "--icon-size": `${size}px` } as CSSProperties}
    />
  );
}
