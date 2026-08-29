/**
 * Who the site is and where it lives.
 *
 * These are the values that were being written out more than once: an address given
 * as text and again as a href, a domain that appears in the contact links, the mail
 * subject, the mail footer and the social card, a town repeated down one data file.
 * Every one of them was somewhere a change could be made in one spot and missed in
 * the others, and the revision number is the case in point — the hero kicker and the
 * social card each carried their own copy, so bumping one left the other behind.
 *
 * Copy is NOT here. Sentences, jokes and section titles stay in src/data/site.ts,
 * because they are read rather than referenced. What lives here is the handful of
 * identifiers those sentences are built out of.
 */

/** Only used to build the two below; the site never renders a bare handle. */
const GITHUB_HANDLE = "jaakofalltrade";
const LINKEDIN_HANDLE = "jaakoandes";

export const SITE_DOMAIN = "jaako.xyz";

export const SITE_URL = `https://${SITE_DOMAIN}`;

/**
 * The masthead revision. Bumped by hand when the design moves.
 *
 * Rendered in the hero kicker and on the social card, which have to agree. A string
 * rather than a number because it is a label — "06" and not 6.
 */
export const SITE_REV = "06";

/** Lower case because every readout on the site is, and this is one of them. */
export const LOCATION = "sorsogon, ph";

/**
 * The address on the contact card — the one a visitor writes to.
 *
 * Distinct from CONTACT_FROM_EMAIL and CONTACT_TO_EMAIL in constants/contact.ts:
 * those two are the Resend sender and recipient, they ship blank, and they are
 * plumbing. This one is copy that has always been on the page.
 */
export const PUBLIC_EMAIL = "jaakoaandes@gmail.com";

export const PUBLIC_EMAIL_HREF = `mailto:${PUBLIC_EMAIL}`;

/**
 * Split into the part that is shown and the part that is followed, because the two
 * genuinely differ: the link text drops the scheme, and LinkedIn's own canonical URL
 * carries a `www.` and a trailing slash that nobody wants to read on the page.
 */
export const GITHUB_PATH = `github.com/${GITHUB_HANDLE}`;

export const GITHUB_URL = `https://${GITHUB_PATH}`;

export const LINKEDIN_PATH = `linkedin.com/in/${LINKEDIN_HANDLE}`;

export const LINKEDIN_URL = `https://www.${LINKEDIN_PATH}/`;
