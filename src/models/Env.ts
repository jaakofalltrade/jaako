/**
 * Which deployment this process is running as.
 *
 * Set through the ENV variable and resolved once in src/server/serverConfig.ts.
 * Anything missing or unrecognised falls back to Local.
 */
export enum Env {
  Local = "LOCAL",
  Staging = "STAGING",
  Production = "PRODUCTION",
}
