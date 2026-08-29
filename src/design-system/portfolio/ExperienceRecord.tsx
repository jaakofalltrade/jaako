import { BadgeTone } from "@/models";
import type { ExperienceItem } from "@/models";
import { Badge } from "../core/Badge";
import { DefinitionList } from "../core/DefinitionList";

export type ExperienceRecordProps = {
  item: ExperienceItem;
  /** Two-digit index, continuing the numbering the homepage entry uses. */
  index: string;
};

/**
 * One company on /experience, in full.
 *
 * The long form of ExperienceEntry, and a separate component rather than a variant of
 * it. The two share a company name and an index and nothing else: this one stacks
 * rather than sitting in three columns, gives each role its own bullets, and puts the
 * metadata in a ruled DefinitionList the way /work/[slug] does. A `detailed` prop on
 * the entry would have been two layouts wearing one name.
 *
 * `stack` is rendered here and nowhere else. It has been sitting in the data since the
 * file was written without ever reaching the page; a record with room for it is what it
 * was always waiting for.
 */
export const ExperienceRecord = ({ item, index }: ExperienceRecordProps) => (
  <article className="jk-xpr" data-archived={item.current ? undefined : ""} data-reveal>
    <span aria-hidden="true" className="jk-xpr__index">
      {index}
    </span>

    <div className="jk-xpr__body">
      <header className="jk-xpr__head">
        <h3 className="jk-xpr__company">{item.company}</h3>
        <Badge tone={item.current ? BadgeTone.Cyan : BadgeTone.Ghost}>
          {item.current ? "active" : "archived"}
        </Badge>
      </header>

      <DefinitionList
        ruled
        className="jk-xpr__meta"
        items={[
          { term: "location", value: item.location },
          { term: "tenure", value: item.total_tenure },
          { term: "stack", value: item.stack.join(" · ") },
        ]}
      />

      <ul className="jk-xpr__roles">
        {item.roles.map((role, position) => (
          <li key={role.title} className="jk-xpr__role">
            {/* The most recent title is emphasised, matching the homepage entry. Not a
                heading: these sit under the company's h3 and a fourth level for a job
                title would be structure the page does not have. */}
            <p className="jk-xpr__role-head">
              {position === 0 ? <strong>{role.title}</strong> : role.title}
              <span className="jk-xpr__period"> · {role.period}</span>
            </p>
            <ul className="jk-xpr__bullets">
              {role.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  </article>
);
