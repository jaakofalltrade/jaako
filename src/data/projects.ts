import { Project, ProjectStatus } from "@/models";

/**
 * Slugs and file names are literals rather than derived from the title. Deriving
 * them meant a regex ran over every project at import time, and the same
 * transformation was written out again in two components.
 */
export const PROJECTS: Project[] = [
  {
    slug: "powpow-bot",
    file_name: "powpow_bot",
    title: "Powpow Bot",
    blurb: "Multi-purpose Discord bot. Moderation, music, and a dice roller nobody asked for.",
    stack: ["python", "discord.py"],
    year: "2021",
    status: ProjectStatus.Maintained,
  },
  {
    slug: "powwow",
    file_name: "powwow",
    title: "Powwow",
    blurb: "Reddit clone on Django REST Framework with a React front end.",
    stack: ["django", "react"],
    year: "2020",
    status: ProjectStatus.Archived,
  },
  {
    slug: "metronome",
    file_name: "metronome",
    title: "Metronome",
    blurb: "A visual metronome. Clicks, blinks, keeps time.",
    stack: ["javascript"],
    year: "2019",
    status: ProjectStatus.Done,
  },
  {
    slug: "poke-catcher",
    file_name: "poke_catcher",
    title: "Poke Catcher",
    blurb: "Simple Pokémon catching game against the PokéAPI.",
    stack: ["react", "api"],
    year: "2019",
    status: ProjectStatus.Done,
  },
  {
    slug: "jaako-xyz",
    file_name: "jaako.xyz",
    title: "jaako.xyz",
    blurb: "This site. Next.js, Sass, one giant background gradient.",
    stack: ["nextjs", "typescript", "scss"],
    year: "2026",
    status: ProjectStatus.Wip,
  },
];

export const getProject = (args: { slug: string }): Project | undefined =>
  PROJECTS.find((project) => project.slug === args.slug);
