import type { ReactNode } from "react";

export type ContactRowProps = {
  label: string;
  value: string;
  href: string;
  icon?: ReactNode;
};

/**
 * One contact link, set as a specification row: label on the left, value on the right,
 * hairline underneath. The icon is decorative — the visible label already names the
 * channel, so announcing it again would just be noise.
 */
export const ContactRow = ({ label, value, href, icon }: ContactRowProps) => (
  <a href={href} className="jk-contact-row">
    {icon ? (
      <span aria-hidden="true" className="jk-contact-row__icon">
        {icon}
      </span>
    ) : null}
    <span className="jk-contact-row__label">{label}</span>
    <span className="jk-contact-row__value">{value}</span>
    <span aria-hidden="true" className="jk-contact-row__arrow">
      →
    </span>
  </a>
);
