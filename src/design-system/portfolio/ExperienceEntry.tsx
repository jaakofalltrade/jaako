import { BadgeTone } from "@/models";
import type { ExperienceItem } from "@/models";
import { Badge } from "../core/Badge";

export const ExperienceEntry = ({
  company,
  location,
  total_tenure,
  roles,
  bullets,
  stack,
  current,
}: ExperienceItem) => (
  <div className="jk-experience">
    <div className="jk-experience__head">
      <div className="jk-experience__company">
        <h3 className="jk-experience__name">{company}</h3>
        {current ? (
          <Badge tone={BadgeTone.Green} blink>
            active
          </Badge>
        ) : (
          <Badge tone={BadgeTone.Steel}>archived</Badge>
        )}
      </div>
      <span className="jk-experience__where">
        {location}
        <br />
        {total_tenure}
      </span>
    </div>

    <div className="jk-experience__roles">
      {roles.map((role) => (
        <div key={role.title} className="jk-experience__role">
          <span className="jk-experience__role-title">{role.title}</span>
          <span className="jk-experience__role-period">{role.period}</span>
        </div>
      ))}
    </div>

    <ul className="jk-experience__bullets">
      {bullets.map((bullet) => (
        <li key={bullet} className="jk-experience__bullet">
          {bullet}
        </li>
      ))}
    </ul>

    <div className="jk-experience__stack">
      {stack.map((entry) => (
        <Badge key={entry} tone={BadgeTone.Steel}>
          {entry}
        </Badge>
      ))}
    </div>
  </div>
);
