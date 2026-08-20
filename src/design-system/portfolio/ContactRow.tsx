import type { ReactNode } from "react";

export interface ContactRowProps {
  label: string;
  value: string;
  href: string;
  icon?: ReactNode;
  className?: string;
}

export function ContactRow({ label, value, href, icon, className }: ContactRowProps) {
  return (
    <a href={href} className={["jk-contact-row", className].filter(Boolean).join(" ")}>
      <span className="jk-contact-row__icon">{icon}</span>
      <span className="jk-contact-row__label">{label}</span>
      <span className="jk-contact-row__value">{value}</span>
    </a>
  );
}
