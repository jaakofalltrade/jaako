import { EMAIL_PATTERN, FIELD_LIMITS } from "@/constants";
import { ValidationFailure } from "@/models";

const CONTROL_CHARS = /[\u0000-\u001f\u007f]+/g;

/**
 * The contact form's field rules, in the one place both sides read them from.
 *
 * They used to be written twice: once in ContactSection so the browser can put an
 * error under the input that caused it, and once in the route's validator so a caller
 * that is not the form cannot get past them. Both already shared EMAIL_PATTERN and
 * FIELD_LIMITS — what they did not share was the logic applied to them, so a change
 * to one was a silent disagreement with the other, and a disagreement here is a
 * rejection the visitor cannot see coming. src/constants/contact.ts warns about
 * exactly that risk on EMAIL_PATTERN; this is the rest of it.
 *
 * Each rule returns the failure or null, and stops there. WHAT TO DO with a failure is
 * still each side's own business and deliberately not shared: the browser wants all
 * three answers at once to place messages under three inputs, the route wants the
 * first one and nothing else. Those are different shapes of answer to the same
 * question, and only the question belongs here.
 *
 * Pure and importable from either side — no fetch, no config, no secrets. The rules
 * running in the browser is not a security control; the route re-runs every one of
 * them on input it never trusts.
 */

/**
 * How a name is prepared before any rule looks at it.
 *
 * Here rather than in the route, and that is the whole point of the file. Sharing the
 * rules but not the preparation put the drift back one step: the route collapsed
 * control characters first and the browser did not, so a name of nothing but control
 * characters passed in the browser — non-empty after a plain trim — and came back a
 * 400 the visitor could not have predicted. The rules only agree if they are handed
 * the same string.
 *
 * The collapse matters because `name` is the one field that reaches a mail header,
 * and a header is line-delimited: a value carrying CRLF is how somebody appends a
 * header of their own choosing, a Bcc being the obvious one. Resend encodes the
 * subject itself, so this is the second lock rather than the first.
 *
 * Only `name` gets it. A message's newlines are the sender's paragraphs and
 * flattening them would corrupt the mail to prevent nothing, and EMAIL_PATTERN
 * already rejects every kind of whitespace.
 */
export const normalizeName = (value: string): string =>
  value.replace(CONTROL_CHARS, " ").trim();

/** Expects a value already through normalizeName. */
export const checkName = (value: string): ValidationFailure | null => {
  if (!value) return ValidationFailure.NameRequired;
  if (value.length > FIELD_LIMITS.name) return ValidationFailure.NameTooLong;
  return null;
};

/**
 * Length and shape collapse to one failure on purpose. A 200-character string that is
 * also not an address is not two problems to the person who typed it, and
 * EmailInvalid is the sentence that helps in both cases.
 */
export const checkEmail = (value: string): ValidationFailure | null => {
  if (!value) return ValidationFailure.EmailRequired;
  if (value.length > FIELD_LIMITS.email || !EMAIL_PATTERN.test(value)) {
    return ValidationFailure.EmailInvalid;
  }
  return null;
};

export const checkMessage = (value: string): ValidationFailure | null => {
  if (!value) return ValidationFailure.MessageRequired;
  if (value.length > FIELD_LIMITS.message) return ValidationFailure.MessageTooLong;
  return null;
};
