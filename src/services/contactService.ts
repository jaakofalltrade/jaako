import { Resend } from "resend";
import { serverConfig } from "@/config/serverConfig";
import {
  CONTACT_HOW_LABEL,
  CONTACT_REASON_LABEL,
  FIELD_LIMITS,
  RATE_LIMIT,
} from "@/constants/contact";
import {
  ContactHow,
  ContactReason,
  ContactRequest,
  ValidationFailure,
  ValidationResult,
} from "@/models";

/**
 * Contact-form plumbing: validation, rate limiting, and the Resend call.
 *
 * Server-only — this reads the Resend key through serverConfig, so it must never
 * be imported from a "use client" file. Its sole consumer is
 * src/app/api/contact/route.ts.
 */

/**
 * Per-IP throttle. Prunes timestamps outside the window on every call, which
 * doubles as the map's garbage collection for that key.
 *
 * Closed over rather than module-level so the store is swappable — see the note
 * on RATE_LIMIT in src/constants/contact.ts.
 */
const createRateLimiter = () => {
  const hits = new Map<string, number[]>();

  return {
    allow: (args: { ip: string }): boolean => {
      const { ip } = args;
      const now = Date.now();
      const recent = (hits.get(ip) ?? []).filter((at) => now - at < RATE_LIMIT.window_ms);

      if (recent.length >= RATE_LIMIT.max) {
        hits.set(ip, recent);
        return false;
      }

      hits.set(ip, [...recent, now]);
      return true;
    },
  };
};

const rateLimiter = createRateLimiter();

/** False when the send path isn't wired up, so the route can say so instead of throwing. */
const isConfigured = (): boolean =>
  Boolean(
    serverConfig.resend_api_key &&
      serverConfig.contact_from_email &&
      serverConfig.contact_to_email,
  );

const trimmed = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const isReason = (value: string): value is ContactReason =>
  (Object.values(ContactReason) as string[]).includes(value);

const isHow = (value: string): value is ContactHow =>
  (Object.values(ContactHow) as string[]).includes(value);

/**
 * Not an RFC-complete address parser, and not trying to be — the only thing riding
 * on it is whether Reply-To will work. Anything shaped wrong gets caught here;
 * anything shaped right but fake bounces on the reply, which is the sender's problem.
 */
const looksLikeEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

/**
 * Validates one raw JSON body.
 *
 * The honeypot check lives here too: `website` is a field the form renders
 * off-screen and no human ever sees, so anything in it means a bot filled the form
 * in blind. What to answer is the route's decision — this only reports the failure.
 */
const validate = (args: { body: unknown }): ValidationResult => {
  const { body } = args;

  if (typeof body !== "object" || body === null) {
    return { ok: false, failure: ValidationFailure.Malformed };
  }

  const raw = body as Record<string, unknown>;

  if (trimmed(raw.website) !== "") {
    return { ok: false, failure: ValidationFailure.Honeypot };
  }

  const name = trimmed(raw.name);
  const email = trimmed(raw.email);
  const message = trimmed(raw.message);
  const reason = trimmed(raw.reason);
  const how = trimmed(raw.how);

  if (!name) return { ok: false, failure: ValidationFailure.NameRequired };
  if (name.length > FIELD_LIMITS.name) {
    return { ok: false, failure: ValidationFailure.NameTooLong };
  }

  if (!email) return { ok: false, failure: ValidationFailure.EmailRequired };
  if (email.length > FIELD_LIMITS.email || !looksLikeEmail(email)) {
    return { ok: false, failure: ValidationFailure.EmailInvalid };
  }

  if (!message) return { ok: false, failure: ValidationFailure.MessageRequired };
  if (message.length > FIELD_LIMITS.message) {
    return { ok: false, failure: ValidationFailure.MessageTooLong };
  }

  if (!isReason(reason)) return { ok: false, failure: ValidationFailure.ReasonInvalid };

  return {
    ok: true,
    request: {
      name,
      email,
      reason,
      message,
      how: isHow(how) ? how : ContactHow.Email,
    },
  };
};

/**
 * Plain text on purpose. An HTML body would need escaping and would land in more
 * spam folders; this is a note to one person, not a newsletter.
 */
const toBody = (args: { request: ContactRequest }): string => {
  const { request } = args;

  return [
    `from:    ${request.name} <${request.email}>`,
    `reason:  ${CONTACT_REASON_LABEL[request.reason]}`,
    `prefers: ${CONTACT_HOW_LABEL[request.how]}`,
    "",
    request.message,
    "",
    "--",
    "sent from the contact form on jaako.xyz",
  ].join("\n");
};

/**
 * Hands the message to Resend. Throws on API failure so the route can log it and
 * answer 502 — the caller should never see a Resend error verbatim.
 */
const send = async (args: { request: ContactRequest }): Promise<void> => {
  const { request } = args;
  const resend = new Resend(serverConfig.resend_api_key);

  const { error } = await resend.emails.send({
    from: serverConfig.contact_from_email,
    to: serverConfig.contact_to_email,
    replyTo: request.email,
    // No cc. The form used to offer "cc me on this", defaulted on, which sent a copy
    // to the sender's own address — harmless, since that is the one place the message
    // had already been. It is gone from the form, and it comes out of here with it
    // rather than lingering as a field nothing can set.
    subject: `[jaako.xyz] ${CONTACT_REASON_LABEL[request.reason]} — ${request.name}`,
    text: toBody({ request }),
  });

  if (error) throw new Error(`${error.name}: ${error.message}`);
};

export const contactService = {
  isConfigured,
  allow: rateLimiter.allow,
  validate,
  send,
};
