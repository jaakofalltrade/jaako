import { ExperienceItem } from "@/models";

/**
 * Roles carry their own bullets now.
 *
 * Restoplus is four titles across six years, and while the copy sat in one list on the
 * company the section could only say that the promotions happened, never what changed
 * at each one. Splitting it means the entry reads as a progression rather than as a
 * job with a long date range, which is the only interesting thing a six-year tenure
 * has to say.
 *
 * No em dashes in any of this. See the standing copy rules; the section separators
 * here are colons and full stops on purpose.
 */
export const EXPERIENCE: ExperienceItem[] = [
  {
    company: "Restoplus",
    location: "Adelaide, South Australia · Remote",
    total_tenure: "6 yrs 1 mo",
    current: true,
    roles: [
      {
        title: "Technical Lead",
        period: "Jul 2024 - Present",
        bullets: [
          "Own the stack reviews, the high-level code review, and the ticket estimates product plans against. Still in the R&D and the implementation plans, because that is the part of the job I did not want to hand off.",
          "In the room for product and executive planning, where most of the work is translating in both directions: what a feature will cost to build, and what the business actually needs it to do.",
          "Take the technical support escalations that get past the front line. It is the fastest way to find out which of your assumptions about how people use the product were wrong.",
          "Onboarding and technical interviews are mine now too. The codebase remembers when it was the other way around.",
        ],
      },
      {
        title: "Senior Software Engineer",
        period: "May 2024 - Jul 2024",
        bullets: [
          "A short stretch between the two, and mostly the title catching up with the work. The architecture and integration calls were already mine to make by then.",
        ],
      },
      {
        title: "Software Engineer",
        period: "Jan 2023 - May 2024",
        bullets: [
          "Ran the research and the rollout for third-party integrations: UberEats, Linkly, ANZ and Tyro, plus the Sunmi terminals and USB printing behind them. Each one started with meetings with the provider's own engineers, working out what their API really did before any of it got written down as a plan. The printers remain undefeated.",
          "Wrote implementation plans and reviewed other people's. The CTO signed off rather than supervised, which is a length of rope I have tried to be worth since.",
          "Architecture work in earnest: raising refactor tickets before the codebase could drift, keeping four integrations from turning into four dialects inside it, and keeping the data structures backwards compatible for the restaurants already running on them.",
          "Onboarding and technical interviews became mine around here. The codebase remembers when it was the other way around.",
        ],
      },
      {
        title: "Junior Developer",
        period: "Aug 2020 - Jan 2023",
        bullets: [
          "Built and maintained the company product in React, Node and TypeScript: the admin portal, and the customer ordering site, which is a restaurant running its own version of what Foodpanda does.",
          "Shipped the company website end to end. Next.js and Ghost CMS, containerised onto Cloud Run with Firebase Hosting in front. Most of what I know about GCP I learned from that pipeline's build failures.",
          "Built the Stripe checkout, and did the research for docket printing to Sunmi and Epson hardware. Payments and printers are both places where you learn to take the failure paths seriously, because every one of them is either somebody's money or somebody's dinner.",
          "Two and a half years of being mentored properly. Most of what I know about writing code other people have to maintain came out of that rather than out of any framework.",
        ],
      },
    ],
    stack: ["react", "typescript", "nextjs", "node.js", "javascript", "firebase", "docker", "gcp"],
  },
  {
    company: "Boomsourcing",
    location: "Legazpi, Bicol Region, Philippines",
    total_tenure: "11 mos",
    roles: [
      {
        title: "Junior Software Developer",
        period: "May 2019 - Mar 2020",
        bullets: [
          "Learned React and Django here, through a bootcamp the company ran for its new developers. First time either one was more than a tutorial tab left open.",
          "Worked tickets on their in-house platform on a sprint cycle, then demoed the results to executives at the end of each one. Explaining a feature to people who are never going to read the code turned out to be its own skill.",
          "First real job. Learned more about shipping deadlines here than in four years of school.",
        ],
      },
    ],
    stack: ["react", "django", "python", "javascript"],
  },
  {
    company: "Bicol University",
    location: "Legazpi City, Albay · Internship",
    total_tenure: "2 mos",
    roles: [
      {
        title: "Web Developer",
        period: "Apr 2018 - May 2018",
        bullets: [
          "Built the system that manages files and appointments for the College of Education, in JavaScript, jQuery, PHP and SQL. The project that started all of this.",
        ],
      },
    ],
    stack: ["javascript", "php", "sql"],
  },
];
