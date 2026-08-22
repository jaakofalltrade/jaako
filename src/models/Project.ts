export enum ProjectStatus {
  Maintained = "MAINTAINED",
  Archived = "ARCHIVED",
  Done = "DONE",
  Wip = "WIP",
}

export type Project = {
  slug: string;
  title: string;
  /** One line. Sets the row in the tracklist and the lead on the detail page. */
  blurb: string;
  /**
   * Path to the project's duotone plate, under /plates. Optional on purpose: with no
   * plate the Plate component renders a procedural fill at the right ratio, so a
   * project without a photograph still holds its slot rather than collapsing.
   */
  plate?: string;
  /** ~250 words: what it is, why it exists, what was hard. Rendered on the detail page. */
  case_note: string;
  /** Shown in the curated homepage tracklist. Everything appears on /work regardless. */
  featured: boolean;
  stack: string[];
  year: string;
  status: ProjectStatus;
};
