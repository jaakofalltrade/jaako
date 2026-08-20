/**
 * Contact-form plumbing: validation, rate limiting, and the Resend call.
 *
 * Server-only — this module reads the Resend API key out of the environment, so
 * it must never be imported from a "use client" file. The sole consumer is
 * src/app/api/contact/route.ts. (The reason list the form and this module agree
 * on lives in src/data/contact.ts, which is safe on both sides.)
 */

import { Resend } from "resend";
import { CONTACT_REASONS, type ContactReason } from "@/data/contact";

/** A validated submission, ready to hand to Resend. */
export interface ContactMessage {
  name: string;
  email: string;
  reason: ContactReason;
  message: string;
  /** Preferred reply channel, straight from the radio group. Cosmetic — it just rides along in the body. */
  how: string;
  /** Whether the sender asked to be copied. */
  cc: boolean;
}

/** Field limits. Generous for humans, tight enough that nobody pastes a novel. */
const LIMITS = { name: 80, email: 160, message: 4000 } as const;

/**
 * Rate limit: how many sends one IP gets, and over what span.
 *
 * Deliberately in-memory. This is a personal site behind a serverless host, so
 * the map is per-instance and resets on redeploy — which is fine, because the
 * job here is stopping a script from hammering the endpoint in one sitting, not
 * enforcing a quota. If the site ever needs a real limiter, swap this for Redis;
 * the call site won't change.
 */
const RATE_LIMIT = { max: 3, windowMs: 10 * 60 * 1000 } as const;

const hits = new Map<string, number[]>();

export interface ContactConfig {
  apiKey: string;
  /** Verified sender, e.g. "jaako.xyz <contact@jaako.xyz>". */
  from: string;
  /** Where the mail lands. */
  to: string;
}

/**
 * Reads the env vars the send path needs. Returns null when any is missing, so
 * the route can answer with a clear "not configured" instead of a stack trace.
 */
export function readConfig(): ContactConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL;

  if (!apiKey || !from || !to) return null;
  return { apiKey, from, to };
}

/**
 * Per-IP throttle. Prunes timestamps outside the window on every call, which
 * doubles as the map's garbage collection for that key.
 */
export function rateLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);

  if (recent.length >= RATE_LIMIT.max) {
    hits.set(ip, recent);
    return false;
  }

  recent.push(now);
  hits.set(ip, recent);
  return true;
}

/**
 * Not an RFC-complete address parser, and not trying to be — the only thing
 * riding on it is whether Reply-To will work. Anything shaped wrong gets caught
 * here; anything shaped right but fake bounces on the reply, which is the
 * sender's problem.
 */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export type ValidationResult = { ok: true; message: ContactMessage } | { ok: false; error: string };

/**
 * Validates one raw JSON body.
 *
 * The honeypot check lives here too: `website` is a field the form renders
 * off-screen and no human ever sees, so anything in it means a bot filled the
 * form in blind.
 */
export function validate(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Malformed request." };

  const raw = body as Record<string, unknown>;

  // Honeypot. Report success upstream rather than a rejection so the bot has no
  // signal to tune against — the route decides what to say; here we just flag it.
  if (typeof raw.website === "string" && raw.website.trim() !== "") {
    return { ok: false, error: "__honeypot__" };
  }

  const name = str(raw.name);
  const email = str(raw.email);
  const message = str(raw.message);
  const reason = str(raw.reason);
  const how = str(raw.how);

  if (!name) return { ok: false, error: "Name is required." };
  if (name.length > LIMITS.name) return { ok: false, error: "That name is too long." };

  if (!email) return { ok: false, error: "E-mail is required — otherwise I can't reply." };
  if (email.length > LIMITS.email || !looksLikeEmail(email)) {
    return { ok: false, error: "That e-mail address doesn't look right." };
  }

  if (!message) return { ok: false, error: "Say something in the message." };
  if (message.length > LIMITS.message) return { ok: false, error: "That message is too long." };

  if (!isReason(reason)) return { ok: false, error: "Pick a reason from the list." };

  return {
    ok: true,
    message: { name, email, reason, message, how: how || "email", cc: raw.cc === true },
  };
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isReason(value: string): value is ContactReason {
  return (CONTACT_REASONS as readonly string[]).includes(value);
}

/**
 * Hands the message to Resend. Throws on API failure so the route can log it
 * and answer 502 — the caller should never see a Resend error verbatim.
 */
export async function send(config: ContactConfig, msg: ContactMessage): Promise<void> {
  const resend = new Resend(config.apiKey);

  const { error } = await resend.emails.send({
    from: config.from,
    to: config.to,
    replyTo: msg.email,
    // cc goes to the sender's own address, so it can only ever leak the message
    // back to whoever wrote it.
    cc: msg.cc ? [msg.email] : undefined,
    subject: `[jaako.xyz] ${msg.reason} — ${msg.name}`,
    text: body(msg),
  });

  if (error) throw new Error(`${error.name}: ${error.message}`);
}

/**
 * Plain text on purpose. An HTML body would need escaping and would land in
 * more spam folders; this is a note to one person, not a newsletter.
 */
function body(msg: ContactMessage): string {
  return [
    `from:    ${msg.name} <${msg.email}>`,
    `reason:  ${msg.reason}`,
    `prefers: ${msg.how}`,
    "",
    msg.message,
    "",
    "--",
    "sent from the contact form on jaako.xyz",
  ].join("\n");
}
