/**
 * The barrel. `import { SITE_URL, RATE_LIMIT, BADGE_TONE_CLASS } from "@/constants"`.
 *
 * Same arrangement as src/models: one file per domain, one door in. Nothing here
 * runs, reads process.env or imports outside src/constants and src/models, so the
 * barrel is safe to pull into a "use client" component — a server-only value would
 * have to be a secret, and secrets are in serverConfig rather than in this folder.
 *
 * Names are unique across the four files on purpose. If two ever collide, rename
 * one rather than reaching past the barrel for it.
 *
 * URLs are NOT here. Our own routes and endpoints live in src/client/endpoints.ts
 * because the browser is what needs them, and Spotify's upstream paths live in
 * src/server/endpoints.ts because the browser must never see them.
 */

export * from "./contact";
export * from "./lab";
export * from "./site";
export * from "./spotify";
export * from "./suggest";
export * from "./ui";
