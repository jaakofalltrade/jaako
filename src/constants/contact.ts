import { ContactHow, ContactReason, ValidationFailure } from "@/models";

/**
 * The copy and the limits for the contact form.
 *
 * The enum values are identifiers — FREELANCE, NAME_TOO_LONG — so everything a
 * human reads is mapped here. That keeps wording changes out of the models and
 * means the dropdown, the mail subject and the error text all read from one place.
 */

export const CONTACT_REASON_LABEL: Record<ContactReason, string> = {
  [ContactReason.Freelance]: "freelance",
  [ContactReason.FullTime]: "full-time",
  [ContactReason.SayingHi]: "just saying hi",
};

/** Order of the <option>s in the reason dropdown. */
export const CONTACT_REASONS: readonly ContactReason[] = [
  ContactReason.Freelance,
  ContactReason.FullTime,
  ContactReason.SayingHi,
];

export const CONTACT_HOW_LABEL: Record<ContactHow, string> = {
  [ContactHow.Email]: "email",
  [ContactHow.Dm]: "dm",
};

export const CONTACT_HOWS: readonly ContactHow[] = [ContactHow.Email, ContactHow.Dm];

/**
 * What the sender is told for each rejection.
 *
 * Honeypot has no message on purpose: the route answers like a success so the bot
 * logs a 200 and moves on, and never sees a signal to tune against.
 */
export const VALIDATION_MESSAGE: Record<ValidationFailure, string> = {
  [ValidationFailure.Malformed]: "Malformed request.",
  [ValidationFailure.Honeypot]: "",
  [ValidationFailure.NameRequired]: "Name is required.",
  [ValidationFailure.NameTooLong]: "That name is too long.",
  [ValidationFailure.EmailRequired]: "E-mail is required, otherwise I can't reply.",
  [ValidationFailure.EmailInvalid]: "That e-mail address doesn't look right.",
  [ValidationFailure.MessageRequired]: "Say something in the message.",
  [ValidationFailure.MessageTooLong]: "That message is too long.",
  [ValidationFailure.ReasonInvalid]: "Pick a reason from the list.",
};

/** Field limits. Generous for humans, tight enough that nobody pastes a novel. */
export const FIELD_LIMITS = { name: 80, email: 160, message: 4000 } as const;

/**
 * Hard cap on the request body. Comfortably above FIELD_LIMITS.
 *
 * Enforced on the received body, with content-length used only as a fast reject —
 * that header is absent on chunked requests and unverified when present.
 */
export const MAX_BODY_BYTES = 16_000;

/**
 * Rate limit: how many sends one IP gets, and over what span.
 *
 * Deliberately in-memory. This is a personal site behind a serverless host, so the
 * map is per-instance and resets on redeploy — which is fine, because the job here
 * is stopping a script from hammering the endpoint in one sitting, not enforcing a
 * quota. If the site ever needs a real limiter, swap the store; the call site won't change.
 */
export const RATE_LIMIT = { max: 3, window_ms: 10 * 60 * 1000 } as const;
