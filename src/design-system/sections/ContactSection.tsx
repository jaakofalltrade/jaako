"use client";

import React from "react";
import { contactApi } from "@/api/contactApi";
import {
  CONTACT_HOWS,
  CONTACT_HOW_LABEL,
  CONTACT_REASONS,
  CONTACT_REASONS_CLOSED,
  CONTACT_REASON_LABEL,
  EMAIL_PATTERN,
  FIELD_LIMITS,
  VALIDATION_MESSAGE,
} from "@/constants/contact";
import {
  BadgeTone,
  ButtonVariant,
  ContactHow,
  ContactReason,
  SubmissionStatus,
  ValidationFailure,
} from "@/models";
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

/**
 * The fields the browser checks.
 *
 * reason and how are radio groups whose options come from the enums themselves, so the
 * only values they can hold are ones this form put there. The route still checks them,
 * for a request that never came from this form.
 */
type CheckedField = "name" | "email" | "message";

/** One message per field that failed. No key, no message. */
type FormErrors = Partial<Record<CheckedField, string>>;

/** One id per field, so a control can point at its own message with aria-describedby. */
const errorId = (field: CheckedField) => `contact-error-${field}`;

/**
 * The same rules contactService enforces, run here so a missing name is answered in
 * the moment instead of after a round trip. A courtesy, not a control: the route
 * validates everything again, because anything running in a browser can be skipped.
 *
 * Plain reads off the form state. The copy is VALIDATION_MESSAGE, the same map the
 * route answers with, so the two cannot word one rejection two ways, and the limits
 * are FIELD_LIMITS, so neither can move without the other.
 *
 * Trimmed before it is measured, exactly as the route does it: a name typed as spaces
 * is an empty name, and a message padded out with them is not a long message.
 */
const validate = (form: typeof EMPTY_FORM): FormErrors => {
  const errors: FormErrors = {};

  const name = form.name.trim();
  const email = form.email.trim();
  const message = form.message.trim();

  if (!name) {
    errors.name = VALIDATION_MESSAGE[ValidationFailure.NameRequired];
  } else if (name.length > FIELD_LIMITS.name) {
    errors.name = VALIDATION_MESSAGE[ValidationFailure.NameTooLong];
  }

  if (!email) {
    errors.email = VALIDATION_MESSAGE[ValidationFailure.EmailRequired];
  } else if (email.length > FIELD_LIMITS.email || !EMAIL_PATTERN.test(email)) {
    errors.email = VALIDATION_MESSAGE[ValidationFailure.EmailInvalid];
  }

  if (!message) {
    errors.message = VALIDATION_MESSAGE[ValidationFailure.MessageRequired];
  } else if (message.length > FIELD_LIMITS.message) {
    errors.message = VALIDATION_MESSAGE[ValidationFailure.MessageTooLong];
  }

  return errors;
};

export const ContactSection = () => {
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [status, setStatus] = React.useState(SubmissionStatus.Idle);
  const [error, setError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const errorRef = React.useRef<HTMLParagraphElement>(null);

  const sent = status === SubmissionStatus.Sent;
  const sending = status === SubmissionStatus.Sending;

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    // Clears this field's message as it is edited. Leaving it up while someone is
    // visibly fixing the thing it complains about is the form arguing with them.
    setErrors((previous) => {
      const field = key as CheckedField;
      if (previous[field] === undefined) return previous;

      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;

    const found = validate(form);

    // The banner stays quiet while the failures are sitting under their own inputs.
    // Repeating the first one at the top of the form says the same thing twice and
    // moves the summary away from the field it describes.
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setError(null);
      return;
    }

    setStatus(SubmissionStatus.Sending);
    setError(null);
    setErrors({});

    const { website, ...request } = form;
    const response = await contactApi.send({ request, website });

    if (!response.ok) {
      // What the route can answer with belongs to no single field: the throttle, an
      // unconfigured form, a Resend outage, and the field rules the browser already
      // checked, which only a caller that is not this form can still trip. The banner
      // is where all of those are said.
      setError(response.error ?? "Something went wrong.");
      setStatus(SubmissionStatus.Idle);
      return;
    }

    setStatus(SubmissionStatus.Sent);
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setErrors({});
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

            <Field label="name" required error={errors.name} errorId={errorId("name")}>
              <Input
                name="name"
                placeholder="your name"
                autoComplete="name"
                invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? errorId("name") : undefined}
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>
            <Field
              label="e-mail"
              required
              hint="i reply within a week, probably"
              error={errors.email}
              errorId={errorId("email")}
            >
              <Input
                name="email"
                type="email"
                placeholder="you@somewhere.net"
                autoComplete="email"
                invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? errorId("email") : undefined}
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
            <Field label="message" required error={errors.message} errorId={errorId("message")}>
              <TextArea
                name="message"
                rows={3}
                placeholder="the queue is closed, but the inbox isn't — say what's on your mind"
                invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? errorId("message") : undefined}
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
