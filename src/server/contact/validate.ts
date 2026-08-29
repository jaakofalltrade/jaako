import "server-only";
import {
  ContactHow,
  ContactReason,
  ValidationFailure,
  ValidationResult,
} from "@/models";
import {
  checkEmail,
  checkMessage,
  checkName,
  normalizeName,
} from "@/utils/contactRules";
import { isEnumValue } from "@/utils/enum";

/**
 * Everything that decides whether a submission is real, and nothing that acts on the
 * answer. No Resend, no config, no secrets — which is what makes this the one file in
 * the folder that can be reasoned about by reading it top to bottom.
 */

const trimmed = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const isReason = isEnumValue(ContactReason);
const isHow = isEnumValue(ContactHow);

/**
 * Validates one raw JSON body.
 *
 * The honeypot check lives here too: `website` is a field the form renders
 * off-screen and no human ever sees, so anything in it means a bot filled the form
 * in blind. What to answer is the route's decision — this only reports the failure.
 */
export const validate = (args: { body: unknown }): ValidationResult => {
  const { body } = args;

  if (typeof body !== "object" || body === null) {
    return { valid: false, failure: ValidationFailure.Malformed };
  }

  const raw = body as Record<string, unknown>;

  if (trimmed(raw.website) !== "") {
    return { valid: false, failure: ValidationFailure.Honeypot };
  }

  // normalizeName, not trimmed: this one reaches a mail header, and the browser
  // prepares it the same way. See utils/contactRules.ts.
  const name = normalizeName(trimmed(raw.name));
  const email = trimmed(raw.email);
  const message = trimmed(raw.message);
  const reason = trimmed(raw.reason);
  const how = trimmed(raw.how);

  // First failure wins and the rest go unreported, which is the right shape here and
  // the wrong one in the browser — see the note in utils/contactRules.ts. A caller
  // that is not the form gets told one thing at a time; the form already knew all
  // three before it sent anything.
  const failure = checkName(name) ?? checkEmail(email) ?? checkMessage(message);
  if (failure) return { valid: false, failure };

  if (!isReason(reason)) return { valid: false, failure: ValidationFailure.ReasonInvalid };

  return {
    valid: true,
    request: {
      name,
      email,
      reason,
      message,
      how: isHow(how) ? how : ContactHow.Email,
    },
  };
};
