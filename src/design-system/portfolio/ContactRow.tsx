import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

export type ContactRowProps = {
  label: string;
  value: string;
  href: string;
  icon?: ReactNode;
  className?: string;
};

export const ContactRow = ({ label, value, href, icon, className }: ContactRowProps) => (
  <a href={href} className={cx("jk-contact-row", className)}>
    <span className="jk-contact-row__icon">{icon}</span>
    <span className="jk-contact-row__label">{label}</span>
    <span className="jk-contact-row__value">{value}</span>
  </a>
);
