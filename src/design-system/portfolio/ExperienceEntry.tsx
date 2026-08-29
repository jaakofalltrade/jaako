import { BadgeTone } from "@/models";
import type { ExperienceItem } from "@/models";
import { Badge } from "../core/Badge";

export type ExperienceEntryProps = {
  item: ExperienceItem;
  /** Two-digit index. The list is numbered like the work tracklist, on purpose. */
  index: string;
};

/**
 * One company on the homepage, as a row rather than a card.
 *
 * The short form. Roles are a <ul> of bare titles because they are a list of positions
 * held, and the most recent one is marked with <strong> rather than colour alone; the
 * bullets underneath are `summary`, which describes the company rather than any one
 * title. What each title actually involved lives on /experience, through the link at
 * the foot of the section.
 *
 * The reason the split exists at all: the full record is thirteen bullets for Restoplus
 * and one for Bicol University, and putting that on the homepage buried the work and
 * contact sections under a CV.
 */
export const ExperienceEntry = ({ item, index }: ExperienceEntryProps) => (
  /* data-archived, same attribute and same reasoning as the work tracklist: the badge
     in the meta column is the carrier, and this is the same fact said at the scale of
     the entry so a past job is recognisable while scanning the column of company names.
     See the rule in widgets/_experience-entry.scss. */
  <article className="jk-xp" data-archived={item.current ? undefined : ""} data-reveal>
    <span aria-hidden="true" className="jk-xp__index">
      {index}
    </span>

    <div className="jk-xp__body">
      <h3 className="jk-xp__company">{item.company}</h3>
      <ul className="jk-xp__roles">
        {item.roles.map((role, position) => (
          <li key={role.title} className="jk-xp__role">
            {position === 0 ? <strong>{role.title}</strong> : role.title}
            <span className="jk-xp__period"> · {role.period}</span>
          </li>
        ))}
      </ul>
      <ul className="jk-xp__bullets">
        {item.summary.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>

    <div className="jk-xp__meta">
      <span className="jk-xp__location">{item.location}</span>
      <span className="jk-xp__tenure">{item.total_tenure}</span>
      <Badge tone={item.current ? BadgeTone.Cyan : BadgeTone.Ghost}>
        {item.current ? "active" : "archived"}
      </Badge>
    </div>
  </article>
);
