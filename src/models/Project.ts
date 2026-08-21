export enum ProjectStatus {
  Maintained = "MAINTAINED",
  Archived = "ARCHIVED",
  Done = "DONE",
  Wip = "WIP",
}

export type Project = {
  slug: string;
  /** Window titlebar text, e.g. "powpow_bot". A literal, not derived from the title. */
  file_name: string;
  title: string;
  blurb: string;
  stack: string[];
  year: string;
  status: ProjectStatus;
};
