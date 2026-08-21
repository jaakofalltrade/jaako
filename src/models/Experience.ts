export type ExperienceRole = {
  title: string;
  period: string;
};

export type ExperienceItem = {
  company: string;
  location: string;
  total_tenure: string;
  roles: ExperienceRole[];
  bullets: string[];
  stack: string[];
  current?: boolean;
};
