import { Env, ServerConfig } from "@/models";

/**
 * Reads the environment once and hands back the config for it.
 *
 * Server-only. This module reads client secrets out of process.env, so it must
 * never be imported from a "use client" file — its only consumers are the two
 * modules in src/services/.
 *
 * The three configs are identical today. That's deliberate: the structure is
 * here so staging can diverge without a refactor, not because it already has.
 */

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

/**
 * Anything missing or unrecognised resolves to Local. A deployment that behaves
 * like local is usually an ENV that never got set.
 *
 * Checked for membership rather than cast: `as Env` would let ENV=production or
 * a blank ENV= through, and then configByEnv[env] is undefined while the type
 * still claims a ServerConfig — which surfaces as a 500 on the first property
 * read, not as a config error.
 */
const toEnv = (value: string | undefined): Env =>
  (Object.values(Env) as string[]).includes(value ?? "") ? (value as Env) : Env.Local;

const env: Env = toEnv(process.env.ENV);

const localConfig: ServerConfig = {
  env: Env.Local,
  spotify_client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
  spotify_client_secret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
  spotify_refresh_token: process.env.SPOTIFY_REFRESH_TOKEN ?? "",
  spotify_token_url: SPOTIFY_TOKEN_URL,
  spotify_api_url: SPOTIFY_API_URL,
  resend_api_key: process.env.RESEND_API_KEY ?? "",
  contact_from_email: process.env.CONTACT_FROM_EMAIL ?? "",
  contact_to_email: process.env.CONTACT_TO_EMAIL ?? "",
};

const stagingConfig: ServerConfig = {
  env: Env.Staging,
  spotify_client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
  spotify_client_secret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
  spotify_refresh_token: process.env.SPOTIFY_REFRESH_TOKEN ?? "",
  spotify_token_url: SPOTIFY_TOKEN_URL,
  spotify_api_url: SPOTIFY_API_URL,
  resend_api_key: process.env.RESEND_API_KEY ?? "",
  contact_from_email: process.env.CONTACT_FROM_EMAIL ?? "",
  contact_to_email: process.env.CONTACT_TO_EMAIL ?? "",
};

const productionConfig: ServerConfig = {
  env: Env.Production,
  spotify_client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
  spotify_client_secret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
  spotify_refresh_token: process.env.SPOTIFY_REFRESH_TOKEN ?? "",
  spotify_token_url: SPOTIFY_TOKEN_URL,
  spotify_api_url: SPOTIFY_API_URL,
  resend_api_key: process.env.RESEND_API_KEY ?? "",
  contact_from_email: process.env.CONTACT_FROM_EMAIL ?? "",
  contact_to_email: process.env.CONTACT_TO_EMAIL ?? "",
};

const configByEnv: Record<Env, ServerConfig> = {
  [Env.Local]: localConfig,
  [Env.Staging]: stagingConfig,
  [Env.Production]: productionConfig,
};

export const serverConfig: ServerConfig = configByEnv[env];
