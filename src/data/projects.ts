export interface Project {
  slug: string;
  title: string;
  blurb: string;
  stack: string[];
  year: string;
  status: string;
}

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const RAW_PROJECTS: Omit<Project, "slug">[] = [
  {
    title: "Powpow Bot",
    blurb: "Multi-purpose Discord bot. Moderation, music, and a dice roller nobody asked for.",
    stack: ["python", "discord.py"],
    year: "2021",
    status: "maintained",
  },
  {
    title: "Powwow",
    blurb: "Reddit clone on Django REST Framework with a React front end.",
    stack: ["django", "react"],
    year: "2020",
    status: "archived",
  },
  {
    title: "Metronome",
    blurb: "A visual metronome. Clicks, blinks, keeps time.",
    stack: ["javascript"],
    year: "2019",
    status: "done",
  },
  {
    title: "Poke Catcher",
    blurb: "Simple Pokémon catching game against the PokéAPI.",
    stack: ["react", "api"],
    year: "2019",
    status: "done",
  },
  {
    title: "jaako.xyz",
    blurb: "This site. Next.js, Sass, one giant background gradient.",
    stack: ["nextjs", "typescript", "scss"],
    year: "2026",
    status: "wip",
  },
];

export const PROJECTS: Project[] = RAW_PROJECTS.map((p) => ({ ...p, slug: slugify(p.title) }));

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
