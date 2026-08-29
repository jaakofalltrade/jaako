import "server-only";
import { Resend } from "resend";
import {
  CONTACT_FROM_EMAIL,
  CONTACT_HOW_LABEL,
  CONTACT_REASON_LABEL,
  CONTACT_TO_EMAIL,
  SITE_DOMAIN,
} from "@/constants";
import { ContactRequest } from "@/models";
import { serverConfig } from "@/server/serverConfig";

/**
 * The half that reaches the outside world: whether a send is possible, what the mail
 * says, and handing it to Resend.
 *
 * The configuration checks live here rather than in their own file because they
 * answer one question and it is this file's question — can this send. Validation
 * knows nothing about them, and the route asks before it gets as far as sending.
 */

/**
 * The names of the values a send needs that aren't set. Empty means ready to send.
 *
 * Still three values, but from two places now: the key comes from the environment
 * and the two addresses from src/constants/contact.ts, which ship blank. Each name
 * is reported with where to go and fix it, because "not configured" is a much less
 * useful thing to read at 2am than which of two files is missing which value.
 */
export const missingConfig = (): string[] =>
  [
    { name: "RESEND_API_KEY (.env.local)", value: serverConfig.resend_api_key },
    { name: "CONTACT_FROM_EMAIL (src/constants/contact.ts)", value: CONTACT_FROM_EMAIL },
    { name: "CONTACT_TO_EMAIL (src/constants/contact.ts)", value: CONTACT_TO_EMAIL },
  ]
    .filter((entry) => !entry.value)
    .map((entry) => entry.name);

/** False when the send path isn't wired up, so the route can say so instead of throwing. */
export const isConfigured = (): boolean => missingConfig().length === 0;

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
    `sent from the contact form on ${SITE_DOMAIN}`,
  ].join("\n");
};

/**
 * Hands the message to Resend. Throws on API failure so the route can log it and
 * answer 502 — the caller should never see a Resend error verbatim.
 */
export const send = async (args: { request: ContactRequest }): Promise<void> => {
  const { request } = args;
  const resend = new Resend(serverConfig.resend_api_key);

  const { error } = await resend.emails.send({
    from: CONTACT_FROM_EMAIL,
    to: CONTACT_TO_EMAIL,
    replyTo: request.email,
    // No cc. The form used to offer "cc me on this", defaulted on, which sent a copy
    // to the sender's own address — harmless, since that is the one place the message
    // had already been. It is gone from the form, and it comes out of here with it
    // rather than lingering as a field nothing can set.
    subject: `[${SITE_DOMAIN}] ${CONTACT_REASON_LABEL[request.reason]} — ${request.name}`,
    text: toBody({ request }),
  });

  if (error) throw new Error(`${error.name}: ${error.message}`);
};
