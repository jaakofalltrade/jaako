import { ContactHow, ContactReason, ValidationFailure } from "@/models";

/**
 * The copy and the limits for the contact form.
 *
 * The enum values are identifiers — FREELANCE, NAME_TOO_LONG — so everything a
 * human reads is mapped here. That keeps wording changes out of the models and
 * means the dropdown, the mail subject and the error text all read from one place.
 */

/**
 * The two ends of the mail: who it comes from, and where it lands.
 *
 * Here rather than in the environment because neither is a secret and neither
 * varies by deployment — they are the same two addresses on localhost as in
 * production, so an env var only meant three places to forget to set one. The
 * Resend API key stays in `.env.local`; that one really is a secret.
 *
 * BLANK ON PURPOSE. While these are empty `contactService.isConfigured()` is false,
 * the route answers 503, and the form tells the visitor to use the e-mail link —
 * which is the honest state for a form whose sending domain is not verified yet.
 * Fill both in to turn the form on. Nothing else has to change.
 *
 * CONTACT_FROM must be an address on a domain verified in Resend, or the shared
 * `onboarding@resend.dev` sender, which needs no DNS but only delivers to the
 * address the Resend account was signed up with.
 */
export const CONTACT_FROM_EMAIL = "";

/** Where submissions land. Blank until the form goes live — see CONTACT_FROM_EMAIL. */
export const CONTACT_TO_EMAIL = "";

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

/**
 * The reasons that are on the list but not on offer. Rendered struck through and
 * unpickable; see the `disabled` note on ChoiceOption in forms/Radio.tsx.
 *
 * They stay in CONTACT_REASONS rather than being deleted from it, and that is the
 * whole point. A reason list with one entry says nothing and looks like a form that
 * forgot to ask; a list with two of its three crossed out answers the question a
 * visitor actually came with — is he taking work — before they have typed anything.
 * It is the same device as the struck copy in the masthead and the footer ticker.
 *
 * TO REOPEN FOR WORK, EMPTY THIS SET. Nothing else has to change: the radio group, the
 * default reason in ContactSection and the message placeholder all read from here or
 * follow from it.
 */
export const CONTACT_REASONS_CLOSED: ReadonlySet<ContactReason> = new Set([
  ContactReason.Freelance,
  ContactReason.FullTime,
]);

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
 * Not an RFC-complete address parser, and not trying to be — the only thing riding on
 * it is whether Reply-To will work. Anything shaped wrong gets caught here; anything
 * shaped right but fake bounces on the reply, which is the sender's problem.
 *
 * Here rather than in contactService because the form checks it too, and a browser and
 * a route that disagree about what an address looks like would be a rejection the
 * visitor cannot see coming.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
