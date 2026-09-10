import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * The CSP is the only part of this that can break a page in a way the type
 * checker won't catch, so what each directive is for is written down:
 *
 * - script-src needs 'unsafe-inline' because Next inlines the hydration payload
 *   and there's no nonce without a middleware to mint one. 'unsafe-eval' is
 *   added outside production only — the dev server needs it for HMR.
 * - style-src needs 'unsafe-inline' because Next inlines critical CSS and
 *   next/font injects a style element.
 * - font-src is 'self' alone: next/font self-hosts every face at build time, so
 *   nothing is fetched from Google at runtime.
 * - img-src admits Spotify's two image CDNs. Album art is on i.scdn.co. Playlist
 *   COVER art is not: a custom-uploaded cover comes back on spotifycdn.com, and the
 *   subdomain rotates - the same image answered as image-cdn-ak and image-cdn-fa on
 *   two consecutive requests - so that one has to be a wildcard rather than a host.
 *   Measured against the real lab playlist, not assumed. The service host-checks every
 *   URL before it reaches an <img>, so this is the second of two locks.
 */
const isProduction = process.env.NODE_ENV === "production";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https://i.scdn.co https://*.spotifycdn.com",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Redundant with frame-ancestors above, kept for browsers that predate it.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  /**
   * PGlite is the local database, and it must not be bundled.
   *
   * It ships a WebAssembly Postgres plus the filesystem code to open a data directory,
   * which Turbopack cannot inline into a server bundle. Listing it here makes the import
   * in src/server/db/index.ts a native require at runtime instead, which is what that
   * dynamic import wants and the only way it resolves.
   *
   * It stays a devDependency. Production sets DATABASE_URL and takes the neon() path, so
   * the import is never reached there; NODE_ENV guards that in the module itself.
   */
  serverExternalPackages: ["@electric-sql/pglite"],

  /**
   * ...and having kept it out of the bundle, keep it out of the deployment too.
   *
   * serverExternalPackages only says "require this at runtime rather than inline it". The
   * file tracer still sees the dynamic import in src/server/db/index.ts and copies the
   * package into the output of every route that reaches it. Measured on this build, with
   * the exclusion removed and put back: 175 files and 20.1MB added to the trace of a
   * single route - a WebAssembly Postgres shipped to a host that takes the neon() path on
   * every request and can never execute the branch that would load it. It also makes the
   * production build depend on a devDependency being installed, so an install with --prod
   * has an external it cannot resolve.
   *
   * Excluded for every route rather than a named one, because the import is in a module
   * any server route can pull in. The NODE_ENV gate in src/server/db/index.ts is what
   * guarantees the branch is unreachable in production; this is what stops us paying for
   * it anyway.
   */
  outputFileTracingExcludes: {
    "/*": ["node_modules/@electric-sql/pglite/**"],
  },

  headers: async () => [
    {
      source: "/:path*",
      headers: SECURITY_HEADERS,
    },
  ],

  // Projects became work in the 2026 redesign. Permanent rather than temporary: the
  // old paths were the only shareable URLs the site had, so anything already pointing
  // at one should end up on the new page for good.
  redirects: async () => [
    { source: "/projects/:slug", destination: "/work/:slug", permanent: true },
    { source: "/projects", destination: "/work", permanent: true },
  ],
};

export default nextConfig;
