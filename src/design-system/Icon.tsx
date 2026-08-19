import type { CSSProperties } from "react";

export interface IconProps {
  name: string;
  size?: number;
  style?: CSSProperties;
}

/** Lucide SVGs from public/icons, tinted to sit in the piss-filter palette. */
export function Icon({ name, size = 18, style }: IconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/${name}.svg`}
      alt=""
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        filter: "invert(84%) sepia(18%) saturate(320%) hue-rotate(20deg) brightness(95%)",
        ...style,
      }}
    />
  );
}
