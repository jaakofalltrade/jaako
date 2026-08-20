import { Badge } from "../core/Badge";
import type { ExperienceItem } from "@/data/experience";

export function ExperienceEntry({
  company,
  location,
  totalTenure,
  roles,
  bullets,
  stack,
  current,
}: ExperienceItem) {
  return (
    <div className="jk-experience">
      <div className="jk-experience__head">
        <div className="jk-experience__company">
          <h3 className="jk-experience__name">{company}</h3>
          {current ? (
            <Badge tone="green" blink>
              active
            </Badge>
          ) : (
            <Badge tone="steel">archived</Badge>
          )}
        </div>
        <span className="jk-experience__where">
          {location}
          <br />
          {totalTenure}
        </span>
      </div>

      <div className="jk-experience__roles">
        {roles.map((r) => (
          <div key={r.title} className="jk-experience__role">
            <span className="jk-experience__role-title">{r.title}</span>
            <span className="jk-experience__role-period">{r.period}</span>
          </div>
        ))}
      </div>

      <ul className="jk-experience__bullets">
        {bullets.map((b) => (
          <li key={b} className="jk-experience__bullet">
            {b}
          </li>
        ))}
      </ul>

      <div className="jk-experience__stack">
        {stack.map((s) => (
          <Badge key={s} tone="steel">
            {s}
          </Badge>
        ))}
      </div>
    </div>
  );
}
