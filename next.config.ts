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
 * - img-src admits Spotify's CDN, which is where album art comes from. The
 *   service already refuses any other host, so this is the second of two locks.
 */
const isProduction = process.env.NODE_ENV === "production";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https://i.scdn.co",
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
