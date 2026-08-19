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
import { Field } from "@/design-system/forms/Field";
import { Input } from "@/design-system/forms/Input";
import { TextArea } from "@/design-system/forms/TextArea";
import { Select } from "@/design-system/forms/Select";
import { Radio } from "@/design-system/forms/Radio";
import { Checkbox } from "@/design-system/forms/Checkbox";
import { scrollToSection } from "@/design-system/scrollToSection";
import { TechLogo, type TechName } from "@/design-system/TechLogo";
import { PROJECTS } from "@/data/projects";

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
      <section id="about" style={{ display: "grid", gap: "var(--space-8)", scrollMarginTop: "var(--space-8)" }}>
        <Hero />
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "var(--space-7)", alignItems: "start" }}>
          <Window title="about_me.txt" footer="last modified 08/17/2026">
            <SectionHeading kicker="01 / about">About me</SectionHeading>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)" }}>
              I build small web things and occasionally finish them. Most of what I know came from breaking other
              people&apos;s repos and reading the stack traces.
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)" }}>
              Currently: Next.js and TypeScript by day, Python when something needs automating.
            </p>
            <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-6)" }}>
              <Link
                href="/#projects"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("projects");
                }}
                style={{ textDecoration: "none" }}
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
          <div style={{ display: "grid", gap: "var(--space-6)" }}>
            <Window title="now_playing" tone="void" rivets={false} footer="scrobbling since forever">
              <NowPlaying />
            </Window>
            <Window title="guestbook.cgi" rivets={false} footer="3 entries">
              <div style={{ display: "grid", gap: "var(--space-4)" }}>
                {GUESTBOOK.map(({ who, msg, status }) => (
                  <div key={who}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "var(--text-2xs)",
                          textTransform: "uppercase",
                          color: "var(--xgreen-lit)",
                        }}
                      >
                        {who}
                      </span>
                      <span
                        aria-hidden="true"
                        title={status}
                        style={{
                          width: 7,
                          height: 7,
                          display: "inline-block",
                          background: status === "online" ? "var(--xgreen)" : "var(--steel-400)",
                          boxShadow: status === "online" ? "var(--glow-green)" : "none",
                          animation: status === "online" ? "jk-blink 1s steps(1,end) infinite" : "none",
                        }}
                      />
                    </div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>
                      {msg}
                    </div>
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "var(--space-4)",
              marginTop: "var(--space-5)",
            }}
          >
            {TECH_STACK.map((t) => (
              <div
                key={t.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-3) var(--space-4)",
                  background: "var(--panel-gradient)",
                  border: "var(--border-1) solid var(--steel-300)",
                  boxShadow: "var(--bevel-metal)",
                }}
              >
                <TechLogo name={t.key} size={22} />
                <span
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "var(--text-sm)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-wide)",
                    color: "var(--text-body)",
                  }}
                >
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </Window>
      </section>

      <section id="projects" style={{ scrollMarginTop: "var(--space-8)" }}>
        <div
          style={{
            display: "grid",
            gap: "var(--space-8)",
            background: "var(--panel-gradient)",
            border: "var(--border-1) solid var(--steel-300)",
            boxShadow: "var(--bevel-metal), var(--shadow-plate)",
            padding: "var(--space-8) var(--space-7)",
          }}
        >
          <SectionHeading kicker="02 / projects" rule={false}>
            Projects
          </SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "var(--space-7)", alignItems: "start" }}>
            {PROJECTS.map((p) => (
              <Link key={p.slug} href={`/projects/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <ProjectCard {...p} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" style={{ display: "grid", gap: "var(--space-8)", scrollMarginTop: "var(--space-8)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-7)", alignItems: "start" }}>
          <Window
            title="contact_form.html"
            footer={sent ? "queued — nothing actually sends" : "all fields optional, like everything"}
          >
            <SectionHeading kicker="03 / contact">Contact me</SectionHeading>
            {sent ? (
              <div style={{ display: "grid", gap: "var(--space-5)", padding: "var(--space-7) 0" }}>
                <Badge tone="green">sent</Badge>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", margin: 0 }}>
                  Thanks. I&apos;ll get back to you eventually.
                </p>
                <Button variant="metal" onClick={() => setSent(false)}>
                  write another
                </Button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "var(--space-5)", marginTop: "var(--space-5)" }}>
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
          <div style={{ display: "grid", gap: "var(--space-6)" }}>
            <Window title="where_to_find_me" padded={false} rivets={false} footer="response time: variable">
              <div style={{ padding: "var(--space-3)" }}>
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
            <GlassPanel style={{ padding: "var(--space-6)" }}>
              <div
                style={{
                  fontFamily: "var(--font-headline)",
                  fontSize: "var(--text-xl)",
                  textTransform: "uppercase",
                  color: "var(--text-strong)",
                }}
              >
                availability
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", margin: "var(--space-3) 0 0" }}>
                Two evenings a week, plus weekends if the project is interesting.
              </p>
            </GlassPanel>
          </div>
        </div>
      </section>
    </>
  );
}
