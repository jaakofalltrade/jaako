import { Project, ProjectStatus } from "@/models";

/**
 * Slugs are literals rather than derived from the title. Deriving them meant a regex
 * ran over every project at import time, and the same transformation was written out
 * again in two components.
 *
 * `file_name` is gone with the fake-window titlebars it existed to fill.
 *
 * `plate` is unset throughout until real photography lands — Plate falls back to a
 * procedural fill, so the layout is already correct at the right aspect ratio.
 */
export const PROJECTS: Project[] = [
  {
    slug: "powpow-bot",
    title: "Powpow Bot",
    blurb: "Multi-purpose Discord bot. Moderation, music, and a dice roller nobody asked for.",
    case_note:
      "Written for one server and still running on several. Moderation, a music queue, and a dice roller that started as a joke and became the most-used command by a wide margin. The interesting part was never the commands. It was keeping a long-lived process healthy on free-tier hosting, which meant treating every Discord API disconnect as expected rather than exceptional.",
    featured: true,
    stack: ["python", "discord.py"],
    year: "2021",
    status: ProjectStatus.Maintained,
  },
  {
    slug: "powwow",
    title: "Powwow",
    blurb: "Reddit clone on Django REST Framework with a React front end.",
    case_note:
      "A Reddit clone, built to learn Django REST Framework properly rather than to launch anything. Threaded comments are the part worth talking about: representing arbitrary-depth trees in a relational schema without an N+1 query on every page load took three attempts, and the version that worked was the one that stopped trying to be clever about it.",
    featured: true,
    stack: ["django", "react"],
    year: "2020",
    status: ProjectStatus.Archived,
  },
  {
    slug: "metronome",
    title: "Metronome",
    blurb: "A visual metronome. Clicks, blinks, keeps time.",
    case_note:
      "A metronome that blinks as well as clicks. Deceptively awkward: setTimeout drifts badly enough to be audible within about thirty seconds, so the timing runs off the Web Audio clock and the visual beat is scheduled against the same source rather than against the frame loop. Small project, but it is the one that taught me that 'close enough' timing is not a thing in audio.",
    featured: false,
    stack: ["javascript"],
    year: "2019",
    status: ProjectStatus.Done,
  },
  {
    slug: "poke-catcher",
    title: "Poke Catcher",
    blurb: "Simple Pokémon catching game against the PokéAPI.",
    case_note:
      "A catching game built against the PokéAPI, made while learning React hooks. Mostly an exercise in caching: the API is generous but slow, and the difference between a game that feels responsive and one that does not turned out to be entirely about prefetching the next encounter while the current one is still on screen.",
    featured: false,
    stack: ["react", "api"],
    year: "2019",
    status: ProjectStatus.Done,
  },
  {
    slug: "jaako-xyz",
    title: "jaako.xyz",
    blurb: "This site. Recursion as a portfolio piece.",
    case_note:
      "This site. Four production dependencies, one stylesheet, no component library and no animation library. The scroll choreography is a single IntersectionObserver and the ground is one held photograph under a frosted overlay. Rebuilt in 2026 from a mid-2000s HUD pastiche into something quieter and lighter. The constraint that shaped it most was the content security policy: no external requests of any kind, which rules out most of the easy answers.",
    featured: true,
    stack: ["nextjs", "typescript", "scss"],
    year: "2026",
    status: ProjectStatus.Wip,
  },
];

export const getProject = (args: { slug: string }): Project | undefined =>
  PROJECTS.find((project) => project.slug === args.slug);

/** The homepage shows a curated few; /work shows everything. */
export const FEATURED_PROJECTS: Project[] = PROJECTS.filter((project) => project.featured);
