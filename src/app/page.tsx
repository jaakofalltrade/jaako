"use client";

import React from "react";
import Link from "next/link";
import { Window } from "@/design-system/core/Window";
import { SectionHeading } from "@/design-system/core/SectionHeading";
import { Badge } from "@/design-system/core/Badge";
import { Button } from "@/design-system/core/Button";
import { GlassPanel } from "@/design-system/core/GlassPanel";
import { Hero } from "@/design-system/portfolio/Hero";
import { Icon } from "@/design-system/Icon";
import { ProjectCard } from "@/design-system/portfolio/ProjectCard";
import { ContactRow } from "@/design-system/portfolio/ContactRow";
import { NowPlaying } from "@/design-system/portfolio/NowPlaying";
import { ExperienceEntry } from "@/design-system/portfolio/ExperienceEntry";
import { Field } from "@/design-system/forms/Field";
import { Input } from "@/design-system/forms/Input";
import { TextArea } from "@/design-system/forms/TextArea";
import { Select } from "@/design-system/forms/Select";
import { Radio } from "@/design-system/forms/Radio";
import { Checkbox } from "@/design-system/forms/Checkbox";
import { scrollToSection } from "@/design-system/scrollToSection";
import { TechLogo, type TechName } from "@/design-system/TechLogo";
import { PROJECTS } from "@/data/projects";
import { EXPERIENCE } from "@/data/experience";

const TECH_STACK: { key: TechName; label: string }[] = [
  { key: "nextjs", label: "Next.js" },
  { key: "react", label: "React" },
  { key: "python", label: "Python" },
  { key: "typescript", label: "TypeScript" },
  { key: "javascript", label: "JavaScript" },
  { key: "docker", label: "Docker" },
  { key: "firebase", label: "Firebase" },
  { key: "gcp", label: "Google Cloud Platform" },
];

const GUESTBOOK: { who: string; msg: string; status: "online" | "offline" }[] = [
  { who: "anon", msg: "cool site, very 2003", status: "offline" },
  { who: "keatrix", msg: "go online, let's play deadlock", status: "online" },
  { who: "kaaayels", msg: "ship the portfolio already", status: "online" },
];

export default function Home() {
  const [sent, setSent] = React.useState(false);
  const [cc, setCc] = React.useState(true);
  const [how, setHow] = React.useState("email");

  return (
    <>
      <section id="about" className="jk-about">
        <Hero />
        <div className="jk-about__grid">
          <Window title="about_me.txt" footer="last modified 08/20/2026">
            <SectionHeading kicker="01 / about">About me</SectionHeading>
            <p className="jk-about__text">
              These days I&apos;m Technical Lead at Restoplus. Six years in, four job titles deep, promoted from
              junior dev without ever sharing a timezone with the office. Most of what I know came from breaking
              other people&apos;s repos and reading the stack traces.
            </p>
            <p className="jk-about__text">
              Frontend and backend, whichever&apos;s on fire. React, TypeScript, and Node.js by day, Python when
              something needs automating.
            </p>
            <div className="jk-about__actions">
              <Link
                href="/#projects"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("projects");
                }}
                className="jk-about__link"
              >
                <Button as="span" variant="hazard">
                  see projects
                </Button>
              </Link>
              <Button variant="metal" icon={<Icon name="save" size={14} />}>
                résumé
              </Button>
            </div>
          </Window>
          <div className="jk-about__aside">
            <Window title="now_playing" tone="void" rivets={false} footer="scrobbling since forever">
              <NowPlaying />
            </Window>
            <Window title="guestbook.cgi" rivets={false} footer="3 entries">
              <div className="jk-guestbook">
                {GUESTBOOK.map(({ who, msg, status }) => (
                  <div key={who}>
                    <div className="jk-guestbook__head">
                      <span className="jk-guestbook__who">{who}</span>
                      <span
                        aria-hidden="true"
                        title={status}
                        className={`jk-guestbook__status${
                          status === "online" ? " jk-guestbook__status--online" : ""
                        }`}
                      />
                    </div>
                    <div className="jk-guestbook__msg">{msg}</div>
                  </div>
                ))}
              </div>
            </Window>
          </div>
        </div>
        <Window title="stack.json" tone="void" controls={false} footer="cloud, containers, and bots">
          <SectionHeading kicker="tech stack" rule={false}>
            What I build with
          </SectionHeading>
          <div className="jk-stack">
            {TECH_STACK.map((t) => (
              <div key={t.key} className="jk-stack__item">
                <TechLogo name={t.key} size={22} />
                <span className="jk-stack__label">{t.label}</span>
              </div>
            ))}
          </div>
        </Window>
      </section>

      <section id="experience" className="jk-experience-section">
        <Window title="career.log" tone="void" controls={false} footer="promoted 3x, still answers to the printers">
          <SectionHeading kicker="02 / experience" rule={false}>
            Where I&apos;ve worked
          </SectionHeading>
          <div className="jk-experience-section__list">
            {EXPERIENCE.map((e) => (
              <ExperienceEntry key={e.company} {...e} />
            ))}
          </div>
        </Window>
      </section>

      <section id="projects" className="jk-projects">
        <div className="jk-projects__panel">
          <SectionHeading kicker="03 / projects" rule={false}>
            Projects
          </SectionHeading>
          <div className="jk-projects__grid">
            {PROJECTS.map((p) => (
              <Link key={p.slug} href={`/projects/${p.slug}`} className="jk-projects__link">
                <ProjectCard {...p} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="jk-contact">
        <div className="jk-contact__grid">
          <Window
            title="contact_form.html"
            footer={sent ? "queued, nothing actually sends" : "all fields optional, like everything"}
          >
            <SectionHeading kicker="04 / contact">Contact me</SectionHeading>
            {sent ? (
              <div className="jk-contact__sent">
                <Badge tone="green">sent</Badge>
                <p className="jk-contact__sent-text">Thanks. I&apos;ll get back to you eventually.</p>
                <Button variant="metal" onClick={() => setSent(false)}>
                  write another
                </Button>
              </div>
            ) : (
              <div className="jk-contact__form">
                <Field label="name" required>
                  <Input placeholder="your name" />
                </Field>
                <Field label="e-mail" hint="i reply within a week, probably">
                  <Input placeholder="you@somewhere.net" />
                </Field>
                <Field label="reason">
                  <Select options={["freelance", "full-time", "just saying hi"]} />
                </Field>
                <Field label="message">
                  <TextArea rows={5} placeholder="what do you need built?" />
                </Field>
                <Radio options={["email", "dm"]} value={how} onChange={setHow} />
                <Checkbox label="cc me on this" checked={cc} onChange={setCc} />
                <Button variant="hazard" fullWidth onClick={() => setSent(true)}>
                  send it
                </Button>
              </div>
            )}
          </Window>
          <div className="jk-contact__aside">
            <Window title="where_to_find_me" padded={false} rivets={false} footer="response time: variable">
              <div className="jk-contact__list">
                <ContactRow
                  label="email"
                  value="jaakoaandes@gmail.com"
                  href="mailto:jaakoaandes@gmail.com"
                  icon={<Icon name="mail" />}
                />
                <ContactRow label="site" value="jaako.xyz" href="https://jaako.xyz" icon={<Icon name="globe" />} />
                <ContactRow
                  label="code"
                  value="github.com/jaakofalltrade"
                  href="https://github.com/jaakofalltrade"
                  icon={<Icon name="terminal" />}
                />
                <ContactRow
                  label="linkedin"
                  value="linkedin.com/in/jaakoandes"
                  href="https://www.linkedin.com/in/jaakoandes/"
                  icon={<Icon name="linkedin" />}
                />
              </div>
            </Window>
            <GlassPanel className="jk-contact__availability">
              <div className="jk-contact__availability-title">availability</div>
              <p className="jk-contact__availability-text">
                Two evenings a week, plus weekends if the project is interesting.
              </p>
            </GlassPanel>
          </div>
        </div>
      </section>
    </>
  );
}
