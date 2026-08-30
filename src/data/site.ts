import { routes } from "@/client/endpoints";
import {
  COORDS_LABEL,
  GITHUB_PATH,
  GITHUB_URL,
  LINKEDIN_PATH,
  LINKEDIN_URL,
  LOCATION,
  PUBLIC_EMAIL,
  PUBLIC_EMAIL_HREF,
  SITE_DOMAIN,
  SITE_REV,
  SITE_URL,
} from "@/constants";
import { IconName } from "@/models";
import type {
  ContactLink,
  CreditPart,
  HeroCopy,
  MetaPair,
  NavItem,
  SectionCopy,
} from "@/models";

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
  title: "jaako andes.",
  title_accent: "andes.",
  blurb:
    "I think therefore I am. Full-stack odd jobs: Next.js, Django, Discord bots, and whatever else the week needs.",
  struck: { retired: "for hire", current: "employed, still curious" },
  kicker: `jaako andes · portfolio · rev ${SITE_REV}`,
  coords: COORDS_LABEL,
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

/**
 * One paragraph.
 *
 * It was three: an origin story about batch files, the "most of what I know" line that
 * had been here all along, and this. Read on the page they were a wall, and the lead
 * above them already says the six-years-four-titles part, so two of the three were
 * spending a lot of words to arrive where the reader already was. This is the one that
 * answers the only question the section is really being asked, which is what this
 * person actually likes doing.
 *
 * The DDoS paper went with the batch-file paragraph. It still has a home: the research
 * block at the foot of /experience, where it no longer depends on this copy to explain
 * why it is there.
 */
export const ABOUT_BODY: string[] = [
  "The parts I like best sit on either side of the typing: reading an implementation plan and finding the case it does not account for, working out how a third-party API behaves as opposed to how its documentation says it behaves, and holding the shape of a system steady while several people add to it. Architecture, in other words. How the pieces fit into something people use without ever having to think about any of it.",
];

export const ABOUT_META: MetaPair[] = [
  { term: "based", value: LOCATION },
  { term: "discipline", value: "full-stack" },
  { term: "remote since", value: "2020" },
  { term: "availability", value: "say hi" },
];

/**
 * The contact card. Only the labels and the icons are copy — every address here comes
 * from src/constants/site.ts, so the text and the link it points at cannot drift apart
 * the way a hand-typed pair can.
 */
export const CONTACT_LINKS: ContactLink[] = [
  {
    label: "email",
    value: PUBLIC_EMAIL,
    href: PUBLIC_EMAIL_HREF,
    icon: IconName.Mail,
  },
  {
    label: "site",
    value: SITE_DOMAIN,
    href: SITE_URL,
    icon: IconName.Globe,
  },
  {
    label: "code",
    value: GITHUB_PATH,
    href: GITHUB_URL,
    icon: IconName.Terminal,
  },
  {
    label: "linkedin",
    value: LINKEDIN_PATH,
    href: LINKEDIN_URL,
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
  availability:
    "Two evenings a week, plus weekends if the project is interesting.",
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
  employment: "employed",
  location: LOCATION,
} as const;

/** Footer ticker. The gag lines, still scrolling, still in the footer. */
export const TICKER: string[] = [
  LOCATION,
  "display ▸ 1024×768 nominal",
  "no cookies, no newsletter",
  "all systems nominal",
];

export const TICKER_STRUCK = {
  retired: "open for work",
  current: "happily employed",
};

export const SECTIONS: Record<
  "about" | "experience" | "work" | "contact",
  SectionCopy
> = {
  about: { index: "01", title: "about", note: "last mod 08·29·2026" },
  experience: { index: "02", title: "experience" },
  work: { index: "03", title: "selected work" },
  contact: { index: "04", title: "contact", note: "one dose, no newsletter" },
};

export const FOOTER = {
  // The copyright, and the fourth easter egg. The name goes to a record sleeve on
  // Spotify's image CDN — a flat .jpg rather than a track page, so it opens as a
  // picture and nothing else, which is the whole of the joke.
  //
  // Only the name is a link. "© 2026" is a plain run, because a copyright notice that
  // was entirely clickable would read as a claim about the destination.
  copyright: [
    { text: "© 2026 " },
    {
      text: "jaako andes",
      href: "https://i.scdn.co/image/ab67616d0000b273d45ec66aa3cf3864205fd068",
    },
  ] as CreditPart[],
  // The old line was "hand-built, no template". Half of that stopped being true: the
  // template part still holds, the hand-built part is doing a lot of work for a page
  // most of which was talked into existence rather than typed. Saying so is funnier
  // than the boast was, and it is the only line in the footer that is about how the
  // thing was made rather than what it is made of.
  //
  // It reads "80 % unethical · 20 % handmade · 0 % template" and it is broken into
  // runs because each of the three words is now a link — see CreditPart. The
  // percentages are the plain runs; the words are the punchline and the punchline is
  // somewhere else. Nothing marks them: a footer credit that announced three easter
  // eggs with underlines would be a nav, and the joke is that you have to be reading
  // it closely enough to hover.
  credit: [
    { text: "80 % " },
    { text: "unethical", href: "https://www.youtube.com/watch?v=TsHrJM1AExc" },
    { text: " · 20 % " },
    { text: "handmade", href: "https://www.youtube.com/watch?v=OyDyOweu-PA" },
    { text: " · 0 % " },
    { text: "template", href: "https://www.youtube.com/watch?v=DhVHnTKkl3U" },
  ] as CreditPart[],
  spec: "plate 01-05 · duotone c-2 · 6400 k",
} as const;

/**
 * Where the full stop at the end of the name goes.
 *
 * The oldest joke on the internet, hidden behind the smallest clickable thing on the
 * page. It is a period in 88px display type, which is roughly a 20px target — small
 * enough that nobody finds it by accident and large enough that anyone who suspects
 * it can hit it.
 */
export const HERO_STOP_HREF = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

/**
 * Recast hit counter. The number is the number; the unit label is the joke.
 *
 * It was 1,985,057 since 2021 and it is 1 since 2026, which is a better joke and also
 * the true one — the site is new. Rendered in a seven-digit odometer it comes out as
 * 0000001, and the "± 1" underneath now spans the entire range of plausible values.
 */
export const VISITOR_INDEX = {
  count: 1,
  unit: "cumulative ± 1 · since 2026",
} as const;

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
  { label: "about", href: routes.section({ id: "about" }), id: "about" },
  {
    label: "experience",
    href: routes.section({ id: "experience" }),
    id: "experience",
    route: routes.experience,
  },
  {
    label: "work",
    href: routes.section({ id: "work" }),
    id: "work",
    route: routes.work,
  },
  { label: "contact", href: routes.section({ id: "contact" }), id: "contact" },
  /**
   * The odd one out, and the reason NavItem.id is optional.
   *
   * The other four name a section of the homepage and scroll to it. The lab is a
   * route with nothing on this page to scroll to, so it carries no `id` and both
   * copies of the list follow `href` instead. It is last because it is the only item
   * that leaves the page, and putting it before contact would bury the contact
   * details behind a slot machine.
   */
  { label: "lab", href: routes.lab.index, route: routes.lab.index },
];
