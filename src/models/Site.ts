/**
 * Shapes for the site's own copy.
 *
 * Everything a reader sees that isn't a project, a job or a track lives in
 * src/data/site.ts against these types. It used to be written inline in JSX across
 * Hero, AboutSection and ContactSection, which meant a change of tone was a hunt
 * through components rather than an edit to one file.
 */

import type { IconName } from "./Ui";

export type MetaPair = {
  term: string;
  value: string;
};

export type ContactLink = {
  label: string;
  value: string;
  href: string;
  icon: IconName;
};

export type SectionCopy = {
  /** Two-digit editorial index — "01". */
  index: string;
  title: string;
  /** Right-aligned annotation on the section rule. Decorative unless flagged. */
  note?: string;
};

export type HeroCopy = {
  title: string;
  blurb: string;
  /** Struck-through phrase and its replacement — the running joke, kept as data. */
  struck: { retired: string; current: string };
  meta: MetaPair[];
  /** The frosted slab that floats on the hero plate. */
  slab: MetaPair[];
  kicker: string;
  coords: string;
};
