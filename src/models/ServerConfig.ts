import { Env } from "./Env";

/**
 * Everything the server needs from its environment, in one flat shape.
 *
 * Each key is its environment variable's name in lowercase, so the type doubles
 * as the list of what belongs in .env.local. Every third party lives here — the
 * next one adds its own block and nothing else moves.
 *
 * Values that are the same everywhere and aren't deployment-specific (limits,
 * cache windows, retry margins) belong in src/constants/, not here.
 */
export type ServerConfig = {
  env: Env;

  // spotify — see docs/spotify-setup.md
  spotify_client_id: string;
  spotify_client_secret: string;
  spotify_refresh_token: string;
  spotify_token_url: string;
  spotify_api_url: string;

  // resend / contact form — see docs/contact-setup.md
  resend_api_key: string;
  contact_from_email: string;
  contact_to_email: string;
};
