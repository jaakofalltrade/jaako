"use client";

import React, { type CSSProperties, type ReactNode } from "react";

export interface ContactRowProps {
  label: string;
  value: string;
  href: string;
  icon?: ReactNode;
  style?: CSSProperties;
}

export function ContactRow({ label, value, href, icon, style }: ContactRowProps) {
  const [hover, setHover] = React.useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "20px 96px 1fr",
        alignItems: "center",
        gap: "var(--space-4)",
        padding: "var(--space-3) var(--space-4)",
        textDecoration: "none",
        background: hover ? "rgba(122,184,0,.08)" : "transparent",
        borderBottom: "var(--border-1) dotted var(--steel-400)",
        transition: "var(--transition-card)",
        ...style,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          width: 18,
          height: 18,
          filter: "invert(84%) sepia(18%) saturate(320%) hue-rotate(20deg) brightness(95%)",
          opacity: hover ? 1 : 0.7,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-caps)",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-sm)",
          color: hover ? "var(--text-link-hover)" : "var(--text-link)",
          textShadow: hover ? "var(--glow-hazard)" : "none",
        }}
      >
        {value}
      </span>
    </a>
  );
}
