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

/**
 * The current employer, named once so the two places that print it can agree.
 *
 * It is a constant rather than a flag on the data because the accent is a
 * presentation decision, exactly as HERO.title_accent and ABOUT_LEAD_EMPHASIS are:
 * this file says what the copy is, and Hero and ExperienceEntry decide which word
 * gets the colour by matching against this. Compared case-insensitively — the hero
 * meta sets it lowercase like everything else in that block, the experience entry
 * uses the company's own capitalisation, and both are the same employer.
 *
 * See .jk-employer in styles/components/_employer.scss for the colour, and the
 * --p-jade note in tokens/_colors.scss for why it is not the mint it started as.
 */
export const EMPLOYER = "restoplus";

export const HERO: HeroCopy = {
  title: "jaako andes.",
  title_accent: "andes.",
  blurb:
    "I think therefore I am. Full-stack odd jobs: Next.js, Django, Discord bots, and whatever else the week needs.",
  struck: { retired: "for hire", current: "employed, still curious" },
  kicker: "jaako andes · portfolio · rev 03",
  coords: "12.9714° N · 123.9944° E",
  meta: [
    { term: "role", value: "technical lead" },
    { term: "at", value: "restoplus" },
    { term: "since", value: "2020 · 4 titles" },
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
  /** The tail of `name` that takes the warm accent, as HERO.title_accent does. */
  name_accent: "andes",
  subtitle: "Full-stack engineer. Remote. Sorsogon, Philippines.",
  dosage: "1 message · ~14 h",
  footnote: "store below 25 °c · keep out of reach of recruiters",
  availability: "Two evenings a week, plus weekends if the project is interesting.",
} as const;

/**
 * The status cell of the instrument strip.
 *
 * It used to be a second copy of the footer ticker — the same four gag lines scrolling
 * under a label that said "status". A marquee under that label is a joke about status
 * rather than a status: nothing in it answered the question a visitor actually has,
 * which is what hours this person keeps and whether they are available. So it is a
 * readout now, and the jokes stay in the footer where they were already running.
 *
 * `local` is not here because it is not copy — it is the clock, and it comes from the
 * reader's own machine at render time. See LocalClock.tsx.
 *
 * TIME_ZONE is an IANA name and not an offset on purpose: it is what Intl needs, and
 * it is the only form that stays right across a DST change. The Philippines does not
 * observe one, so `utc_offset` can be the flat string it is — if this ever moves
 * somewhere that does, that field has to be derived from TIME_ZONE rather than typed.
 */
export const STATUS = {
  time_zone: "Asia/Manila",
  zone_label: "pht",
  utc_offset: "gmt+8",
  employment: "employed, still curious",
  location: "sorsogon, ph",
} as const;

/** Footer ticker. The gag lines, still scrolling, still in the footer. */
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
  // The old line was "hand-built, no template". Half of that stopped being true: the
  // template part still holds, the hand-built part is doing a lot of work for a page
  // most of which was talked into existence rather than typed. Saying so is funnier
  // than the boast was, and it is the only line in the footer that is about how the
  // thing was made rather than what it is made of.
  credit: "80 % vibecoded · 20 % remorse · 0 % template",
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
