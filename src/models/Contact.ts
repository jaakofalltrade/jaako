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

export type ContactResponse = {
  ok: boolean;
  error?: string;
};

export type ValidationResult =
  | { ok: true; request: ContactRequest }
  | { ok: false; failure: ValidationFailure };
