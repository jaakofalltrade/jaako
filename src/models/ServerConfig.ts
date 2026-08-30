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

  // the lab playlist that /lab/suggest writes to. Not a secret, but it DOES vary
  // by deployment, which is the whole reason it is here and not in src/constants:
  // staging pointing at the real playlist would mean test adds on the playlist
  // jaako actually listens to. See docs/suggest-setup.md.
  spotify_playlist_id: string;

  // neon postgres, shared by the lab apps — see docs/neon-setup.md
  database_url: string;

  // resend / contact form — see docs/contact-setup.md
  // The key only. The from and to addresses are not secret and do not vary by
  // deployment, so they live in src/constants/contact.ts.
  resend_api_key: string;
};
