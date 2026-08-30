/**
 * Stands in for the `server-only` package under Vitest. See vitest.config.ts.
 *
 * The real module throws on import so that a client component pulling in a server
 * module is a build error rather than a leaked secret. That guard is about the
 * bundler, not about the test runner, and leaving it in place would mean the purest
 * code in the repo — the Spotify mappers — could not be tested at all.
 */
export {};
