import "server-only";
import { randomUUID } from "node:crypto";
import { VISITOR_COOKIE, VISITOR_COOKIE_MAX_AGE_S } from "@/constants";
import { NAME_LIMITS } from "@/constants";

/**
 * Who is asking, as far as the lab is concerned.
 *
 * An opaque random id in an httpOnly cookie, plus the name that visitor last signed
 * with. No account, no login, no personal data beyond a display name they chose. It is
 * resettable by clearing cookies or opening a private window, and for a toy with a cap
 * of three that is fine; pretending otherwise would mean a login wall on a playlist.
 *
 * SET ONLY ON A SUCCESSFUL ADD, WHICH IS THE PART WORTH KEEPING. Somebody who reads the
 * playlist and leaves is never given a cookie at all, so the site is cookieless for
 * everyone who does not act. That is also why the add route mints an id during the
 * request rather than expecting one to exist: the first add is counted against an id
 * the browser does not have yet, and the Set-Cookie goes out with the response.
 *
 * At the root of src/server rather than inside suggest/, because the slot machine will
 * count its three pulls a day against the same visitor.
 */

export type Visitor = {
  id: string;
  /** The last name this visitor used, so a returning one adds in a single click. */
  name: string | null;
};

/** Both halves in one cookie: two would be two things to expire out of step. */
type CookiePayload = { id: string; name?: string };

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * Reads the cookie, or null.
 *
 * EVERY FIELD IS RE-VALIDATED, because a cookie is input. It is httpOnly, so no script
 * on the page can have written it, but that is a statement about the browser rather
 * than about what arrives at the server: the value is whatever the request carried.
 * A malformed id would otherwise reach a uuid column and become a database error
 * instead of a fresh visitor.
 */
export const readVisitor = (args: { request: Request }): Visitor | null => {
  const header = args.request.headers.get("cookie");
  if (!header) return null;

  const raw = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${VISITOR_COOKIE}=`))
    ?.slice(VISITOR_COOKIE.length + 1);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as CookiePayload;
    if (!isUuid(parsed?.id)) return null;

    // A name longer than the field allows was not written by this site, and a name
    // that fails the length rule should not be silently reused on the next add.
    const name =
      typeof parsed.name === "string" &&
      parsed.name.length >= NAME_LIMITS.min &&
      parsed.name.length <= NAME_LIMITS.max
        ? parsed.name
        : null;

    return { id: parsed.id, name };
  } catch {
    return null;
  }
};

/** A new visitor. Not persisted until something is worth counting against it. */
export const mintVisitor = (): Visitor => ({ id: randomUUID(), name: null });

/**
 * The Set-Cookie value.
 *
 * httpOnly so no script can read it, sameSite=Lax so it rides an ordinary navigation
 * but not a cross-site POST, and Secure everywhere except plain-http localhost, where
 * setting it would mean the cookie is silently dropped during development.
 *
 * Path is the whole site rather than /lab, because the slot machine will read the same
 * visitor and a cookie scoped to one app would hand it a different person.
 */
export const visitorCookie = (args: { visitor: Visitor; secure: boolean }): string => {
  const { visitor, secure } = args;

  const payload: CookiePayload = visitor.name
    ? { id: visitor.id, name: visitor.name }
    : { id: visitor.id };

  return [
    `${VISITOR_COOKIE}=${encodeURIComponent(JSON.stringify(payload))}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${VISITOR_COOKIE_MAX_AGE_S}`,
    secure ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
};
