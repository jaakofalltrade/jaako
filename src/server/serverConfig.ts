import "server-only";
import { SUGGEST_PLAYLIST_ID_DEVELOPMENT, SUGGEST_PLAYLIST_ID_PRODUCTION } from "@/constants";
import { Env, ServerConfig } from "@/models";
import { isEnumValue } from "@/utils/enum";

/**
 * Reads the environment once and hands back the config for it.
 *
 * Server-only, and enforced rather than asserted: the `server-only` import above
 * makes reaching this from a "use client" file a build error. That guard belongs here
 * more than anywhere else in the folder, because this is the module that actually
 * reads the Resend key and the Spotify secret out of process.env. Without it the
 * failure is silent in the worst way — Next inlines nothing but NEXT_PUBLIC_*, so
 * every secret field would arrive in the browser as undefined and the panel and the
 * form would quietly degrade instead of the build stopping.
 *
 * The three configs used to be identical, and the structure was here so a tier could
 * diverge without a refactor. THE PLAYLIST IS THE FIRST FIELD THAT ACTUALLY DOES:
 * local and staging write to the sandbox, production writes to the live playlist.
 *
 * WHICH MEANS ENV NOW HAS TEETH. While the tiers were identical an unset ENV cost
 * nothing, because every branch of configByEnv held the same values. Now an unset ENV
 * on the production host resolves to Local and sends real visitor adds to the sandbox
 * playlist, silently and with no error anywhere. Two things guard that, and both are
 * deliberately outside this file: ENV=PRODUCTION set on the host, and
 * SPOTIFY_PLAYLIST_ID set there too, which wins whatever the tier resolves to. Setting
 * the second is what makes a missing ENV a cosmetic bug rather than a wrong playlist.
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
const isEnv = isEnumValue(Env);

const toEnv = (value: string | undefined): Env => {
  const candidate = value ?? "";
  // No cast on the way out: the guard narrows `candidate` to Env, which is the whole
  // reason isEnumValue returns a type predicate rather than a boolean.
  return isEnv(candidate) ? candidate : Env.Local;
};

const env: Env = toEnv(process.env.ENV);

const localConfig: ServerConfig = {
  env: Env.Local,
  spotify_client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
  spotify_client_secret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
  spotify_refresh_token: process.env.SPOTIFY_REFRESH_TOKEN ?? "",
  spotify_write_refresh_token: process.env.SPOTIFY_WRITE_REFRESH_TOKEN ?? "",
  spotify_token_url: SPOTIFY_TOKEN_URL,
  spotify_api_url: SPOTIFY_API_URL,
  spotify_playlist_id: process.env.SPOTIFY_PLAYLIST_ID || SUGGEST_PLAYLIST_ID_DEVELOPMENT,
  database_url: process.env.DATABASE_URL ?? "",
  resend_api_key: process.env.RESEND_API_KEY ?? "",
};

const stagingConfig: ServerConfig = {
  env: Env.Staging,
  spotify_client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
  spotify_client_secret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
  spotify_refresh_token: process.env.SPOTIFY_REFRESH_TOKEN ?? "",
  spotify_write_refresh_token: process.env.SPOTIFY_WRITE_REFRESH_TOKEN ?? "",
  spotify_token_url: SPOTIFY_TOKEN_URL,
  spotify_api_url: SPOTIFY_API_URL,
  // Shares the sandbox with local rather than owning a third playlist: the point is
  // that it is not the live one, and two ids are enough to express that. Give staging
  // its own by setting SPOTIFY_PLAYLIST_ID on that deployment.
  spotify_playlist_id: process.env.SPOTIFY_PLAYLIST_ID || SUGGEST_PLAYLIST_ID_DEVELOPMENT,
  database_url: process.env.DATABASE_URL ?? "",
  resend_api_key: process.env.RESEND_API_KEY ?? "",
};

const productionConfig: ServerConfig = {
  env: Env.Production,
  spotify_client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
  spotify_client_secret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
  spotify_refresh_token: process.env.SPOTIFY_REFRESH_TOKEN ?? "",
  spotify_write_refresh_token: process.env.SPOTIFY_WRITE_REFRESH_TOKEN ?? "",
  spotify_token_url: SPOTIFY_TOKEN_URL,
  spotify_api_url: SPOTIFY_API_URL,
  // The only line in this file that names the live playlist. Reached only when ENV is
  // actually PRODUCTION on the host; see the header.
  spotify_playlist_id: process.env.SPOTIFY_PLAYLIST_ID || SUGGEST_PLAYLIST_ID_PRODUCTION,
  database_url: process.env.DATABASE_URL ?? "",
  resend_api_key: process.env.RESEND_API_KEY ?? "",
};

const configByEnv: Record<Env, ServerConfig> = {
  [Env.Local]: localConfig,
  [Env.Staging]: stagingConfig,
  [Env.Production]: productionConfig,
};

export const serverConfig: ServerConfig = configByEnv[env];
