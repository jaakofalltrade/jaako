export type ExperienceRole = {
  title: string;
  period: string;
  /**
   * The lines belonging to this title specifically.
   *
   * These used to live on ExperienceItem, one flat list per company. That worked while
   * every entry was a single job, but Restoplus is four titles over six years and a
   * shared list flattened the promotions back into one undifferentiated blur. What the
   * entry is actually a record of is the change between the roles, so the copy has to
   * hang off the roles.
   */
  bullets: string[];
};

export type ExperienceItem = {
  company: string;
  location: string;
  total_tenure: string;
  roles: ExperienceRole[];
  stack: string[];
  current?: boolean;
};
