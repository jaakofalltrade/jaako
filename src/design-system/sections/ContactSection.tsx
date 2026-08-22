"use client";

import React from "react";
import { contactApi } from "@/api/contactApi";
import {
  CONTACT_HOWS,
  CONTACT_HOW_LABEL,
  CONTACT_REASONS,
  CONTACT_REASON_LABEL,
} from "@/constants/contact";
import { BadgeTone, ButtonVariant, ContactHow, ContactReason, SubmissionStatus } from "@/models";
import { CONTACT_LINKS, CONTACT_SPEC, SECTIONS } from "@/data/site";
import { Badge } from "../core/Badge";
import { Button } from "../core/Button";
import { SectionHead } from "../core/SectionHead";
import { Checkbox } from "../forms/Checkbox";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Radio } from "../forms/Radio";
import { Select } from "../forms/Select";
import { TextArea } from "../forms/TextArea";
import { Icon } from "../Icon";
import { ContactRow } from "../portfolio/ContactRow";
import { SpecBlock } from "../portfolio/SpecBlock";

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
  /** Honeypot, rendered off-screen and never filled by a human. See contactService. */
  website: "",
};

export const ContactSection = () => {
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [status, setStatus] = React.useState(SubmissionStatus.Idle);
  const [error, setError] = React.useState<string | null>(null);
  const errorRef = React.useRef<HTMLParagraphElement>(null);

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

  // A failed submission puts the reason at the top of the form, which a keyboard user
  // has usually already scrolled past. Moving focus to it is what makes the message
  // reachable rather than merely present.
  React.useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  return (
    <section id="contact" className="jk-section jk-contact">
      <SectionHead index={SECTIONS.contact.index} note={SECTIONS.contact.note}>
        {SECTIONS.contact.title}
      </SectionHead>

      <SpecBlock>
        <div className="jk-spec__grid">
          {CONTACT_LINKS.map((link) => (
            <ContactRow
              key={link.label}
              label={link.label}
              value={link.value}
              href={link.href}
              icon={<Icon name={link.icon} size={14} />}
            />
          ))}
          <div className="jk-spec__dosage">
            <span className="jk-spec__dosage-term">dosage</span>
            <span className="jk-spec__dosage-value">{CONTACT_SPEC.dosage}</span>
          </div>
        </div>
      </SpecBlock>

      <div className="jk-contact__form-wrap" data-reveal>
        {sent ? (
          <div className="jk-contact__sent">
            <Badge tone={BadgeTone.Cyan}>sent</Badge>
            <p className="jk-contact__sent-text">Thanks. I will get back to you eventually.</p>
            <Button variant={ButtonVariant.Glass} onClick={reset}>
              write another
            </Button>
          </div>
        ) : (
          <form className="jk-contact__form" onSubmit={handleSubmit} noValidate>
            {error ? (
              <p ref={errorRef} tabIndex={-1} role="alert" className="jk-contact__error">
                {error}
              </p>
            ) : null}

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

            <Radio options={HOW_OPTIONS} value={form.how} onChange={(how) => set("how", how)} />
            <Checkbox label="cc me on this" checked={form.cc} onChange={(cc) => set("cc", cc)} />

            <Button
              type="submit"
              variant={ButtonVariant.Primary}
              fullWidth
              disabled={sending}
              aria-busy={sending}
            >
              {sending ? "sending" : "send it"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
};
