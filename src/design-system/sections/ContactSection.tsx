"use client";

import React from "react";
import { contactApi } from "@/api/contactApi";
import {
  CONTACT_HOWS,
  CONTACT_HOW_LABEL,
  CONTACT_REASONS,
  CONTACT_REASONS_CLOSED,
  CONTACT_REASON_LABEL,
} from "@/constants/contact";
import { BadgeTone, ButtonVariant, ContactHow, ContactReason, SubmissionStatus } from "@/models";
import { CONTACT_LINKS, CONTACT_SPEC, SECTIONS } from "@/data/site";
import { Badge } from "../core/Badge";
import { Button } from "../core/Button";
import { SectionHead } from "../core/SectionHead";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Radio } from "../forms/Radio";
import { TextArea } from "../forms/TextArea";
import { Icon } from "../Icon";
import { ContactRow } from "../portfolio/ContactRow";
import { SpecBlock } from "../portfolio/SpecBlock";

const REASON_OPTIONS = CONTACT_REASONS.map((reason) => ({
  value: reason,
  label: CONTACT_REASON_LABEL[reason],
  disabled: CONTACT_REASONS_CLOSED.has(reason),
}));

/**
 * The first reason still on offer, and what the form opens on.
 *
 * Derived rather than written down as SayingHi, because a default that is hard-coded
 * next to a closed-set that is not will eventually disagree with it — and the failure
 * is silent and bad: the form would open with a disabled radio pre-selected, which no
 * browser lets the visitor change and no validation would catch. Emptying
 * CONTACT_REASONS_CLOSED puts this back to freelance on its own.
 */
const DEFAULT_REASON =
  CONTACT_REASONS.find((reason) => !CONTACT_REASONS_CLOSED.has(reason)) ?? ContactReason.SayingHi;

const HOW_OPTIONS = CONTACT_HOWS.map((how) => ({
  value: how,
  label: CONTACT_HOW_LABEL[how],
}));

/** Blank form. Kept out of the component so "write another" can reset to it. */
const EMPTY_FORM = {
  name: "",
  email: "",
  reason: DEFAULT_REASON,
  message: "",
  how: ContactHow.Email,
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
            {/*
              A fieldset rather than a Field. Field renders a <label>, and a label
              names exactly one control — wrapping three radios in it would nest a
              label inside three more and leave the group itself unnamed. legend is
              the element that names a set of controls, which is what this now is.

              Kept as a plain block, not .jk-field's grid: a legend inside a grid or
              flex container is laid out by rules of its own and browsers disagree
              about the result. The gap under it is a margin instead.
            */}
            <fieldset className="jk-fieldset">
              <legend className="jk-field__label">reason</legend>
              <Radio
                name="reason"
                options={REASON_OPTIONS}
                value={form.reason}
                onChange={(reason) => set("reason", reason)}
                inline
              />
            </fieldset>
            {/* The placeholder carries the same news as the struck radios above it,
                because a placeholder is the thing people actually read before they
                start typing. It says no to the work and yes to the message in one
                breath — the point is not to close the form, it is to stop someone
                drafting a job offer that was never going to land. */}
            <Field label="message" required>
              <TextArea
                name="message"
                rows={3}
                placeholder="the queue is closed, but the inbox isn't — say what's on your mind"
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

            {/* name="how" so this group is distinct from the reason radios above —
                two groups sharing the default name would behave as one. */}
            <Radio
              name="how"
              options={HOW_OPTIONS}
              value={form.how}
              onChange={(how) => set("how", how)}
              inline
            />
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
