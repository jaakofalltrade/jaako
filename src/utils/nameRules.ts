import { NAME_LIMITS } from "@/constants";
import { SuggestFailure } from "@/models";

/**
 * The display name on a song suggestion, in the one place both sides read it from.
 *
 * The same arrangement as contactRules.ts, and for the reason its header gives: a
 * rule enforced in the browser but not in the route, or applied to a differently
 * prepared string, is a rejection the visitor cannot see coming. Both sides call
 * normalizeDisplayName first and check what comes out.
 *
 * WHAT IS NOT HERE IS THE POINT. The blocklist check lives in
 * src/server/suggest/blocklist.ts and runs on the server only. Three reasons, in
 * order of weight: the term hashes would otherwise be shipped to every browser that
 * loads the page, hashing in the browser is asynchronous through SubtleCrypto while
 * Node's is not, and a name rejected for containing a slur is the one failure that
 * does not want friendly inline feedback as somebody types. Length is a courtesy the
 * browser can pay; the blocklist is a control, and controls belong on the server.
 *
 * Pure and dependency-free otherwise. The rules running in the browser are not a
 * security boundary; the route re-runs every one of them on input it never trusts.
 */

const CONTROL_CHARS = /[\u0000-\u001f\u007f]+/g;
const COLLAPSIBLE_SPACE = /\s+/g;

/**
 * How a display name is prepared before any rule looks at it.
 *
 * Control characters go for the same reason contactRules.ts strips them, minus the
 * mail-header argument: this string does not reach a header, it reaches a public web
 * page, so the concern is a name that renders as nothing while passing a non-empty
 * check. Runs of whitespace collapse to one, so "a         b" cannot spend nine of
 * its ten characters on air.
 */
export const normalizeDisplayName = (value: string): string =>
  value.replace(CONTROL_CHARS, " ").replace(COLLAPSIBLE_SPACE, " ").trim();

/**
 * Length only. Expects a value already through normalizeDisplayName.
 *
 * TEN IS SHORT AND THAT IS DELIBERATE. It does not fit "christopher", which is worth
 * knowing rather than discovering: the field is a signature on somebody else's
 * playlist, not an identity, and the cap is what stops a row's name running longer
 * than the track title beside it. The floor of three is what stops it being a single
 * initial, which reads as noise on a list of four.
 */
export const checkDisplayName = (value: string): SuggestFailure | null => {
  if (!value) return SuggestFailure.NameRequired;
  if (value.length < NAME_LIMITS.min) return SuggestFailure.NameTooShort;
  if (value.length > NAME_LIMITS.max) return SuggestFailure.NameTooLong;
  return null;
};
