import { ExperienceItem, ResearchItem } from "@/models";

/**
 * Two tiers, written separately.
 *
 * `summary` is the homepage: two or three lines per company, the whole job in about the
 * space one role takes on the full record. `roles[].bullets` is /experience, where
 * Restoplus gets to be four titles across six years rather than a long date range.
 *
 * The summaries are not excerpts of the bullets. Taking the first lines of the detail
 * would summarise the most recent title instead of the job, and would make the record
 * read as padding to anyone who followed the link. They overlap at exactly two points,
 * both of them jokes that have earned the repetition.
 *
 * No em dashes in any of this. See the standing copy rules; the separators here are
 * colons and full stops on purpose.
 */
export const EXPERIENCE: ExperienceItem[] = [
  {
    company: "Restoplus",
    location: "Adelaide, South Australia · Remote",
    total_tenure: "6 yrs 1 mo",
    current: true,
    summary: [
      "Runs the stack reviews, the high-level code review and the hiring, and still writes implementation plans. Six years and four titles in.",
      "Built the POS from scratch and later took it offline-first, and ran the research and the rollout for everything it talks to: UberEats, Linkly, ANZ, Tyro, and the terminals and printers behind them. The printers remain undefeated.",
      "Started on the admin and ordering portals, which is where TypeScript, Stripe, Firebase and GCP all turned up at once.",
    ],
    roles: [
      {
        title: "Technical Lead",
        period: "Jul 2024 - Present",
        bullets: [
          "Own the stack reviews, the high-level code review, and the ticket estimates product plans against. Still in the R&D and the implementation plans, because that is the part of the job I did not want to hand off.",
          "In the room for product and executive planning, where most of the work is translating in both directions: what a feature will cost to build, and what the business actually needs it to do.",
          "Take the technical support escalations that get past the front line. It is the fastest way to find out which of your assumptions about how people use the product were wrong.",
          "Took the POS offline-first. Its state moved out of MobX and into IndexedDB so a terminal keeps taking orders when the connection drops, which in a restaurant it does, and reconciles once the network is back. Rewriting the state layer of a product already running in kitchens is the most careful work I have done.",
          "Cut the Android releases. The POS ships as a native shell around a WebView, so a release is a store submission stacked on top of a web deploy, and two release processes means two sets of things that can be wrong at once.",
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
          "Built the POS from scratch with the team. TypeScript and Firebase, with MobX holding the terminal state, and it is where every payment and printer integration eventually has to land, so the hardware work and the POS work were never really two jobs.",
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
    stack: [
      "react",
      "typescript",
      "nextjs",
      "node.js",
      "javascript",
      "mobx",
      "indexeddb",
      "firebase",
      "docker",
      "gcp",
      "android",
    ],
  },
  {
    company: "Boomsourcing",
    location: "Legazpi, Bicol Region, Philippines",
    total_tenure: "11 mos",
    summary: [
      "Learned React and Django through the bootcamp the company ran for its new developers, then worked tickets on their in-house platform.",
      "First real job. Learned more about shipping deadlines here than in four years of school.",
    ],
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
    summary: [
      "Built the system that manages files and appointments for the College of Education. The project that started all of this.",
    ],
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

/**
 * Published work, at the foot of /experience.
 *
 * The about section used to point at the DDoS paper, and this block existed to catch
 * that reference. The about copy is one paragraph now and the reference went with it,
 * which leaves these two standing on their own: a review paper and an undergraduate
 * thesis, both real, neither with anywhere else on the site to sit. That is reason
 * enough. The thesis is also the only machine-learning work on the record.
 */
export const RESEARCH: ResearchItem[] = [
  {
    title: "Synopsis of DDoS Algorithms: A Review",
    venue: "ResearchGate",
    period: "Feb 2019",
    note: "A survey of the algorithms proposed for preventing and mitigating distributed denial of service attacks, and the case that none of them generalises. Each defence answers one attack shape, because the thing being exploited is how the internet is connected rather than a bug anyone is going to close.",
  },
  {
    title: "Bidirectional English-Bicol Neural Machine Translator Based on Sequence to Sequence Model",
    venue: "Bicol University",
    period: "Jun 2018 - Mar 2019",
    note: "Undergraduate thesis. An encoder-decoder RNN in PyTorch, single-layer GRU with an attention mechanism, scored with BLEU. The model was the straightforward half: Bicol has almost no parallel text in it, so the corpus had to be web-scraped and then checked line by line with a local linguist before any of it could be trained on.",
  },
];
