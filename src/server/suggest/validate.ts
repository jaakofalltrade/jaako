import "server-only";
import { SuggestFailure } from "@/models";
import type { SuggestValidation } from "@/models";
import { checkDisplayName, normalizeDisplayName } from "@/utils/nameRules";
import { trackIdFromUri } from "@/server/spotify/mappers";
import { blocklist } from "./blocklist";

/**
 * Everything that decides whether a suggestion is real, and nothing that acts on the
 * answer.
 *
 * The same shape as server/contact/validate.ts, and for the reason its header gives:
 * no fetch, no config, no secrets, so this is the one file in the folder that can be
 * reasoned about by reading it top to bottom.
 *
 * WHAT IS NOT CHECKED HERE IS AS DELIBERATE AS WHAT IS. The track's duration, whether
 * it is already on the playlist, and whether the visitor has any adds left are all
 * decided against something outside this process, so they belong to the route where
 * the cost and the ordering of those calls can be seen. This answers only the question
 * that can be answered from the request itself.
 *
 * First failure wins and the rest go unreported, which is right for a caller that is
 * not our own page. The page already knows the name is too short before it sends
 * anything; a caller that is not the page gets told one thing at a time.
 */

const trimmed = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export const validate = (args: { body: unknown }): SuggestValidation => {
  const { body } = args;

  if (typeof body !== "object" || body === null) {
    return { valid: false, failure: SuggestFailure.Malformed };
  }

  const raw = body as Record<string, unknown>;

  // normalizeDisplayName first, so the rule sees the same string the browser checked.
  // Sharing the rules but not the preparation is how contactRules.ts once drifted.
  const name = normalizeDisplayName(trimmed(raw.name));
  const track_uri = trimmed(raw.track_uri);

  const failure = checkDisplayName(name);
  if (failure) return { valid: false, failure };

  // Server-side only, and after the length rules: no point running a matcher over
  // something already refused for being two characters long.
  if (blocklist.blocks(name)) {
    return { valid: false, failure: SuggestFailure.NameBlocked };
  }

  // Strict, because this reaches a URL path and a request body sent to Spotify. Only
  // the exact uri shape passes; see trackIdFromUri.
  if (!trackIdFromUri(track_uri)) {
    return { valid: false, failure: SuggestFailure.TrackInvalid };
  }

  return { valid: true, request: { track_uri, name } };
};
