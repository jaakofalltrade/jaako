export type ExperienceRole = {
  title: string;
  period: string;
  /**
   * The full account of this one title. Rendered only on /experience.
   *
   * These used to be a single flat list on ExperienceItem, shared by every title under
   * a company. That works while an entry is one job, but Restoplus is four titles over
   * six years and a shared list flattens the promotions into one undifferentiated
   * blur. What the record is actually about is the change between the roles, so the
   * copy hangs off the roles.
   */
  bullets: string[];
};

export type ExperienceItem = {
  company: string;
  location: string;
  total_tenure: string;
  roles: ExperienceRole[];
  /**
   * Two or three lines for the homepage: the whole company in about the space one role
   * takes on /experience.
   *
   * Deliberately not a slice of `roles[].bullets`. A summary that is the first N lines
   * of the detail is a summary of the most recent title rather than of the job, and it
   * makes the full record read as padding when the reader gets there. These are
   * written to be the short version, and the detail is written to reward the click.
   */
  summary: string[];
  stack: string[];
  current?: boolean;
};

/**
 * Published work. Rendered at the foot of /experience, not on the homepage.
 *
 * It sits in this file rather than its own because it is the same record: a paper and
 * a thesis are things the career produced, and there is nowhere else on the site they
 * would sit. The about copy used to point at the DDoS paper and no longer does; see the
 * note on RESEARCH in src/data/experience.ts for what that changed and what it did not.
 */
export type ResearchItem = {
  title: string;
  venue: string;
  period: string;
  note: string;
};
