export interface ExperienceRole {
  title: string;
  period: string;
}

export interface ExperienceItem {
  company: string;
  location: string;
  totalTenure: string;
  roles: ExperienceRole[];
  bullets: string[];
  stack: string[];
  current?: boolean;
}

export const EXPERIENCE: ExperienceItem[] = [
  {
    company: "Restoplus",
    location: "Adelaide, South Australia · Remote",
    totalTenure: "6 yrs 1 mo",
    current: true,
    roles: [
      { title: "Technical Lead", period: "Jul 2024 – Present" },
      { title: "Senior Software Engineer", period: "May 2024 – Jul 2024" },
      { title: "Software Engineer", period: "Jan 2023 – May 2024" },
      { title: "Junior Developer", period: "Aug 2020 – Jan 2023" },
    ],
    bullets: [
      "Went from junior dev to tech lead without ever sharing a timezone with the office.",
      "Shipped and maintained third-party integrations (Linkly, Sunmi, Stripe, Tyro, USB printing). The printers remain undefeated.",
      "Runs code reviews, onboarding, and technical interviews now; the codebase remembers when it was the other way around.",
    ],
    stack: ["react", "typescript", "nextjs", "node.js", "javascript", "firebase", "docker", "gcp"],
  },
  {
    company: "Boomsourcing",
    location: "Legazpi, Bicol Region, Philippines",
    totalTenure: "11 mos",
    roles: [{ title: "Junior Software Developer", period: "May 2019 – Mar 2020" }],
    bullets: ["First real job. Learned more about shipping deadlines here than in four years of school."],
    stack: ["javascript"],
  },
  {
    company: "Bicol University",
    location: "Legazpi City, Albay · Internship",
    totalTenure: "2 mos",
    roles: [{ title: "Web Developer", period: "Apr 2018 – May 2018" }],
    bullets: ["Built an inventory system for the College of Education with JS, jQuery, PHP, and SQL. The project that started all of this."],
    stack: ["javascript", "php", "sql"],
  },
];
