"use client";

import Link from "next/link";
import { PRESENCE_CLASS, PRESENCE_LABEL, TECH_LABEL } from "@/constants/ui";
import { GUESTBOOK } from "@/data/guestbook";
import { TECH_STACK } from "@/data/techStack";
import { ButtonVariant, IconName, PanelTone } from "@/models";
import { cx } from "@/utils/cx";
import { Button } from "../core/Button";
import { SectionHeading } from "../core/SectionHeading";
import { Window } from "../core/Window";
import { Icon } from "../Icon";
import { TechLogo } from "../TechLogo";
import { scrollToSection } from "../scrollToSection";
import { Hero } from "../portfolio/Hero";
import { NowPlaying } from "../portfolio/NowPlaying";

export const AboutSection = () => (
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
            onClick={(event) => {
              event.preventDefault();
              scrollToSection({ id: "projects" });
            }}
            className="jk-about__link"
          >
            <Button as="span" variant={ButtonVariant.Hazard}>
              see projects
            </Button>
          </Link>
          <Button variant={ButtonVariant.Metal} icon={<Icon name={IconName.Save} size={14} />}>
            résumé
          </Button>
        </div>
        <div className="jk-about__stack">
          <span className="jk-about__stack-label">Tech stack</span>
          <div className="jk-stack">
            {TECH_STACK.map((tech) => (
              <div key={tech} className="jk-stack__item">
                <TechLogo name={tech} size={22} />
                <span className="jk-stack__label">{TECH_LABEL[tech]}</span>
              </div>
            ))}
          </div>
        </div>
      </Window>

      <div className="jk-about__aside">
        <Window
          title="now_playing"
          tone={PanelTone.Void}
          rivets={false}
          footer="scrobbling since forever"
        >
          <NowPlaying />
        </Window>
        <Window
          title="guestbook.cgi"
          rivets={false}
          footer="3 entries"
          className="jk-guestbook-window"
        >
          <div className="jk-guestbook">
            {GUESTBOOK.map((entry) => (
              <div key={entry.who}>
                <div className="jk-guestbook__head">
                  <span className="jk-guestbook__who">{entry.who}</span>
                  <span
                    aria-hidden="true"
                    title={PRESENCE_LABEL[entry.status]}
                    className={cx("jk-guestbook__status", PRESENCE_CLASS[entry.status])}
                  />
                </div>
                <div className="jk-guestbook__msg">{entry.message}</div>
              </div>
            ))}
          </div>
        </Window>
      </div>
    </div>
  </section>
);
