/**
 * The reason dropdown on the contact form.
 *
 * Shared deliberately: the form renders these as <option>s and the route
 * handler validates the submitted value against the same list, so a bot posting
 * a made-up reason is rejected instead of ending up in the subject line.
 */
export const CONTACT_REASONS = ["freelance", "full-time", "just saying hi"] as const;

export type ContactReason = (typeof CONTACT_REASONS)[number];
