import { IconName } from "@/models";
import type { ContactLink, HeroCopy, MetaPair, NavItem, SectionCopy } from "@/models";

/**
 * The site's copy.
 *
 * Tone note: the jokes are the ones that were always here — they are just delivered
 * straight now. "best viewed in 1024×768" became "display ▸ 1024×768 nominal"; the
 * struck-through gag survives verbatim because it still works. Retired copy stays
 * struck rather than deleted, which is the whole point of it.
 */

export const BRAND = "jaako";

export const HERO: HeroCopy = {
  title: "<<jaako_andes>>",
  blurb:
    "I think therefore I am. Full-stack odd jobs: Next.js, Django, Discord bots, and whatever else the week needs.",
  struck: { retired: "for hire", current: "employed, still curious" },
  kicker: "jaako andes · portfolio · rev 03",
  coords: "12°58′N 124°00′E",
  meta: [
    { term: "role", value: "technical lead" },
    { term: "at", value: "restoplus" },
    { term: "since", value: "2020 · 4 titles" },
  ],
  slab: [
    { term: "status", value: "employed" },
    { term: "local", value: "GMT+8" },
    { term: "reply", value: "~14 h" },
  ],
};

export const ABOUT_LEAD =
  "Six years in, four job titles deep, promoted from junior dev to technical lead without ever sharing a timezone with the office.";

/** The phrase inside ABOUT_LEAD that takes the cyan chrome fill. */
export const ABOUT_LEAD_EMPHASIS = "technical lead";

export const ABOUT_BODY: string[] = [
  "Most of what I know came from breaking other people's repos and reading the stack traces. Frontend and backend, whichever's on fire. React, TypeScript and Node by day, Python when something needs automating.",
];

export const ABOUT_META: MetaPair[] = [
  { term: "based", value: "sorsogon, ph" },
  { term: "discipline", value: "full-stack" },
  { term: "remote since", value: "2020" },
  { term: "availability", value: "say hi anyway" },
];

export const CONTACT_LINKS: ContactLink[] = [
  {
    label: "email",
    value: "jaakoaandes@gmail.com",
    href: "mailto:jaakoaandes@gmail.com",
    icon: IconName.Mail,
  },
  { label: "site", value: "jaako.xyz", href: "https://jaako.xyz", icon: IconName.Globe },
  {
    label: "code",
    value: "github.com/jaakofalltrade",
    href: "https://github.com/jaakofalltrade",
    icon: IconName.Terminal,
  },
  {
    label: "linkedin",
    value: "linkedin.com/in/jaakoandes",
    href: "https://www.linkedin.com/in/jaakoandes/",
    icon: IconName.Linkedin,
  },
];

/** The pharmaceutical-label block. Dry on purpose — it is a contact section as a datasheet. */
export const CONTACT_SPEC = {
  name: "jaako andes",
  subtitle: "Full-stack engineer. Remote. Sorsogon, Philippines.",
  dosage: "1 message · ~14 h",
  footnote: "store below 25 °c · keep out of reach of recruiters",
  availability: "Two evenings a week, plus weekends if the project is interesting.",
} as const;

/** Status ticker. Formerly the footer marquee; same lines, read out as instrument status. */
export const TICKER: string[] = [
  "sorsogon, ph",
  "display ▸ 1024×768 nominal",
  "no cookies, no newsletter",
  "all systems nominal",
];

export const TICKER_STRUCK = { retired: "open for work", current: "happily employed" };

export const SECTIONS: Record<"about" | "experience" | "work" | "contact", SectionCopy> = {
  about: { index: "01", title: "about", note: "last mod 08·20·2026" },
  experience: { index: "02", title: "experience" },
  work: { index: "03", title: "selected work" },
  contact: { index: "04", title: "contact", note: "one dose, no newsletter" },
};

export const FOOTER = {
  credit: "hand-built, no template",
  spec: "plate 01-05 · duotone c-2 · 6400 k",
} as const;

/** Recast hit counter. The number is the number; the unit label is the joke. */
export const VISITOR_INDEX = { count: 1985057, unit: "cumulative ± 1 · since 2021" } as const;

/**
 * The section index, rendered twice: inline above the about section by SectionNav,
 * and in the footer by SiteFooter.
 *
 * Both copies are needed and they are not interchangeable. The inline one only ever
 * appears on the homepage, so its anchors are bare fragments; the footer is on every
 * page, so its links are absolute and carry the leading slash. `route` marks the
 * items that also own a real path, which is what lets /work and /work/<slug> keep a
 * way back into the page they belong to.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "about", href: "/#about", id: "about" },
  { label: "experience", href: "/#experience", id: "experience" },
  { label: "work", href: "/#work", id: "work", route: "/work" },
  { label: "contact", href: "/#contact", id: "contact" },
];
