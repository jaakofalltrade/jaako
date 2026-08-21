"use client";

import React from "react";
import { contactApi } from "@/api/contactApi";
import {
  CONTACT_HOWS,
  CONTACT_HOW_LABEL,
  CONTACT_REASONS,
  CONTACT_REASON_LABEL,
} from "@/constants/contact";
import {
  BadgeTone,
  ButtonVariant,
  ContactHow,
  ContactReason,
  IconName,
  SubmissionStatus,
} from "@/models";
import { Badge } from "../core/Badge";
import { Button } from "../core/Button";
import { GlassPanel } from "../core/GlassPanel";
import { SectionHeading } from "../core/SectionHeading";
import { Window } from "../core/Window";
import { Checkbox } from "../forms/Checkbox";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Radio } from "../forms/Radio";
import { Select } from "../forms/Select";
import { TextArea } from "../forms/TextArea";
import { Icon } from "../Icon";
import { ContactRow } from "../portfolio/ContactRow";

const REASON_OPTIONS = CONTACT_REASONS.map((reason) => ({
  value: reason,
  label: CONTACT_REASON_LABEL[reason],
}));

const HOW_OPTIONS = CONTACT_HOWS.map((how) => ({
  value: how,
  label: CONTACT_HOW_LABEL[how],
}));

/** Blank form. Kept out of the component so "write another" can reset to it. */
const EMPTY_FORM = {
  name: "",
  email: "",
  reason: ContactReason.Freelance,
  message: "",
  how: ContactHow.Email,
  cc: true,
  /** Honeypot — rendered off-screen, never filled by a human. See contactService. */
  website: "",
};

export const ContactSection = () => {
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [status, setStatus] = React.useState(SubmissionStatus.Idle);
  const [error, setError] = React.useState<string | null>(null);

  const sent = status === SubmissionStatus.Sent;
  const sending = status === SubmissionStatus.Sending;

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;

    setStatus(SubmissionStatus.Sending);
    setError(null);

    const { website, ...request } = form;
    const response = await contactApi.send({ request, website });

    if (!response.ok) {
      setError(response.error ?? "Something went wrong.");
      setStatus(SubmissionStatus.Idle);
      return;
    }

    setStatus(SubmissionStatus.Sent);
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setStatus(SubmissionStatus.Idle);
  };

  return (
    <section id="contact" className="jk-contact">
      <div className="jk-contact__grid">
        <Window
          title="contact_form.html"
          footer={sent ? "delivered — check your inbox if you ticked cc" : "starred fields, please"}
        >
          <SectionHeading kicker="04 / contact">Contact me</SectionHeading>
          {sent ? (
            <div className="jk-contact__sent">
              <Badge tone={BadgeTone.Green}>sent</Badge>
              <p className="jk-contact__sent-text">Thanks. I&apos;ll get back to you eventually.</p>
              <Button variant={ButtonVariant.Metal} onClick={reset}>
                write another
              </Button>
            </div>
          ) : (
            <form className="jk-contact__form" onSubmit={handleSubmit} noValidate>
              <Field label="name" required>
                <Input
                  name="name"
                  placeholder="your name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                />
              </Field>
              <Field label="e-mail" required hint="i reply within a week, probably">
                <Input
                  name="email"
                  type="email"
                  placeholder="you@somewhere.net"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => set("email", event.target.value)}
                />
              </Field>
              <Field label="reason">
                <Select
                  name="reason"
                  options={REASON_OPTIONS}
                  value={form.reason}
                  onChange={(reason) => set("reason", reason)}
                />
              </Field>
              <Field label="message" required>
                <TextArea
                  name="message"
                  rows={5}
                  placeholder="what do you need built?"
                  value={form.message}
                  onChange={(event) => set("message", event.target.value)}
                />
              </Field>

              {/* Honeypot. Hidden from sight and from the tab order, so only a bot
                  filling every input it finds will ever put something here. */}
              <div className="jk-contact__honeypot" aria-hidden="true">
                <label>
                  website
                  <input
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(event) => set("website", event.target.value)}
                  />
                </label>
              </div>

              <Radio
                options={HOW_OPTIONS}
                value={form.how}
                onChange={(how) => set("how", how)}
              />
              <Checkbox
                label="cc me on this"
                checked={form.cc}
                onChange={(cc) => set("cc", cc)}
              />
              {error ? (
                <p role="alert" className="jk-contact__error">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                variant={ButtonVariant.Hazard}
                fullWidth
                disabled={sending}
                aria-busy={sending}
              >
                {sending ? "sending…" : "send it"}
              </Button>
            </form>
          )}
        </Window>

        <div className="jk-contact__aside">
          <Window
            title="where_to_find_me"
            padded={false}
            rivets={false}
            footer="response time: variable"
          >
            <div className="jk-contact__list">
              <ContactRow
                label="email"
                value="jaakoaandes@gmail.com"
                href="mailto:jaakoaandes@gmail.com"
                icon={<Icon name={IconName.Mail} />}
              />
              <ContactRow
                label="site"
                value="jaako.xyz"
                href="https://jaako.xyz"
                icon={<Icon name={IconName.Globe} />}
              />
              <ContactRow
                label="code"
                value="github.com/jaakofalltrade"
                href="https://github.com/jaakofalltrade"
                icon={<Icon name={IconName.Terminal} />}
              />
              <ContactRow
                label="linkedin"
                value="linkedin.com/in/jaakoandes"
                href="https://www.linkedin.com/in/jaakoandes/"
                icon={<Icon name={IconName.Linkedin} />}
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
  );
};
