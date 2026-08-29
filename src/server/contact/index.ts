import "server-only";
import { rateLimiter } from "./rateLimiter";
import { isConfigured, missingConfig, send } from "./send";
import { validate } from "./validate";

/**
 * `import { contactService } from "@/server/contact"`.
 *
 * Assembled here rather than exported piecemeal because the route walks the whole
 * sequence in order — configured, validate, allow, send — and the object is what
 * makes that sequence readable at the call site.
 *
 * `allow` is lifted out of the limiter rather than passing the limiter along: the
 * route has no business holding the store, only asking it a question.
 */
export const contactService = {
  isConfigured,
  missingConfig,
  allow: rateLimiter.allow,
  validate,
  send,
};
