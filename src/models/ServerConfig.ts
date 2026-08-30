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

  // TWO REFRESH TOKENS, ONE ACCOUNT, AND THE SPLIT IS INTENT RATHER THAN ENFORCEMENT.
  //
  // Spotify's scopes are verbs rather than resources, so there is no such thing as a
  // token that may write to one playlist. A token per job is the next best thing, and
  // it matters most for the lab's search proxy, which is public and unauthenticated
  // and spends the read one.
  //
  // IT DOES NOT MAKE THE READ TOKEN READ-ONLY. Spotify grants scopes per application,
  // so approving the write scope widened both of these; "pnpm token:check" shows it.
  // Nothing should be written that depends on the read credential being unable to
  // write. See the header of src/server/spotify/auth.ts.
  spotify_refresh_token: string;
  spotify_write_refresh_token: string;
  spotify_token_url: string;
  spotify_api_url: string;

  // THE ADD ROUTE MUST READ THE PLAYLIST FROM HERE AND NEVER FROM A REQUEST.
  //
  // This is what actually stops a visitor writing to a playlist that is not the lab
  // one, and it is stronger than any scope: the destination is simply not part of the
  // input, so there is no request that can name a different playlist. The token split
  // above bounds what a LEAKED credential can do; this bounds what a visitor can do,
  // and the two are different problems.
  //
  // If a playlist id ever appears in an AddRequest, that is the bug.
  //
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
