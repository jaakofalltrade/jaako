/**
 * The contact form: what the browser sends, what the route answers, and every
 * way a submission can be rejected.
 *
 * The human-readable text for ContactReason and ValidationFailure lives in
 * src/constants/contact.ts — these values are identifiers, not copy.
 */

export enum ContactReason {
  Freelance = "FREELANCE",
  FullTime = "FULL_TIME",
  SayingHi = "SAYING_HI",
}

/** Preferred reply channel, straight from the radio group. Cosmetic — it just rides along in the body. */
export enum ContactHow {
  Email = "EMAIL",
  Dm = "DM",
}

export enum SubmissionStatus {
  Idle = "IDLE",
  Sending = "SENDING",
  Sent = "SENT",
}

export enum ValidationFailure {
  Malformed = "MALFORMED",
  /** A bot filled the off-screen field. The route answers 200 anyway — see contactService. */
  Honeypot = "HONEYPOT",
  NameRequired = "NAME_REQUIRED",
  NameTooLong = "NAME_TOO_LONG",
  EmailRequired = "EMAIL_REQUIRED",
  EmailInvalid = "EMAIL_INVALID",
  MessageRequired = "MESSAGE_REQUIRED",
  MessageTooLong = "MESSAGE_TOO_LONG",
  ReasonInvalid = "REASON_INVALID",
}

/** A validated submission, ready to hand to Resend. */
export type ContactRequest = {
  name: string;
  email: string;
  reason: ContactReason;
  message: string;
  how: ContactHow;
};

/**
 * What POST /api/contact answers with, and the only thing the form branches on.
 *
 * The field was called `ok`, which asked every reader to guess what was ok — the
 * request, the body, the network, the send. It is the send: `sent` is true when the
 * message reached Resend, and false for every other outcome, including the ones that
 * never got as far as trying.
 *
 * ONE DELIBERATE LIE. A honeypot hit answers `sent: true` having sent nothing at all,
 * so a bot logs a 200 and stops tuning against the response. That is the only place
 * these two disagree; see the route.
 */
export type ContactResponse = {
  /** True once the message is on its way. False means nothing was sent — read `error`. */
  sent: boolean;
  /** A sentence written for the sender to read. Present only when `sent` is false. */
  error?: string;
};

/**
 * The verdict on one raw request body, from contactService.validate.
 *
 * `valid` is the discriminant, so narrowing on it hands back the half that actually
 * exists: the parsed `request` on the way through, the `failure` on the way out.
 * Neither is reachable without checking first, which is the whole reason this is a
 * union rather than an object with three optional fields.
 */
export type ValidationResult =
  | { valid: true; request: ContactRequest }
  | { valid: false; failure: ValidationFailure };
