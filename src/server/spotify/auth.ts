import "server-only";
import { TOKEN_EXPIRY_MARGIN_MS } from "@/constants";
import { serverConfig } from "@/server/serverConfig";
import { Spotify } from "@/models";

/**
 * The credentials half of the Spotify integration: is it wired up, and what bearer
 * token do we send.
 *
 * Its own file because it is the only part of this folder that touches a secret.
 * Everything else here handles data that has already come back.
 *
 * TWO CREDENTIALS, NOT ONE, AND EVERY EXPORT BELOW COMES IN A PAIR BECAUSE OF IT.
 *
 * Spotify's scopes are verbs rather than resources, so no token can be restricted to a
 * single playlist. The next best thing is least privilege per code path: the read token
 * carries only the three read scopes and physically cannot write, and the write token
 * carries playlist-modify-public and nothing else.
 *
 * The read one is what almost everything spends, including the lab's search proxy,
 * which is public and unauthenticated. The write one is reached by exactly one route.
 * If a third job ever appears, give it its own rather than widening one of these.
 */

/**
 * Access tokens live an hour, so one is held in module scope and reused across
 * requests landing on the same warm server instance.
 *
 * The closure is the point: this is the only mutable state in the folder, and
 * swapping it for Redis later means replacing this factory and nothing else.
 */
const createTokenCache = () => {
  let cached: { value: string; expires_at: number } | null = null;

  return {
    read: (): string | null =>
      cached && cached.expires_at > Date.now() ? cached.value : null,
    write: (args: { value: string; ttl_ms: number }) => {
      const { value, ttl_ms } = args;
      cached = {
        value,
        expires_at: Date.now() + ttl_ms - TOKEN_EXPIRY_MARGIN_MS,
      };
    },
    clear: () => {
      cached = null;
    },
  };
};

/**
 * One cache per credential, which is the whole reason the factory above exists rather
 * than a module-level pair of variables. The two tokens have different scopes and
 * different lifetimes and must never be handed to each other's callers.
 */
const readTokenCache = createTokenCache();
const writeTokenCache = createTokenCache();

/** The client pair, which both credentials share. */
const hasClient = (): boolean =>
  Boolean(serverConfig.spotify_client_id && serverConfig.spotify_client_secret);

/** False on a fresh clone or a host with a forgotten variable — the panel degrades instead of throwing. */
export const hasCredentials = (): boolean =>
  Boolean(hasClient() && serverConfig.spotify_refresh_token);

/**
 * Separate from hasCredentials, and the separation is the point: the write token is
 * expected to be missing on a deployment that has not been re-authorised yet, and that
 * is a working site with one route switched off rather than a broken one. Reads
 * degrade, writes refuse out loud.
 */
export const hasWriteCredentials = (): boolean =>
  Boolean(hasClient() && serverConfig.spotify_write_refresh_token);

/**
 * Exchanges one refresh token for an access token, through its own cache.
 *
 * Private, because a caller choosing which refresh token to send is exactly the mistake
 * the split exists to prevent. The two exported wrappers below are the interface.
 */
const exchange = async (args: {
  refresh_token: string;
  cache: ReturnType<typeof createTokenCache>;
  label: string;
}): Promise<string> => {
  const { refresh_token, cache, label } = args;

  const cached = cache.read();
  if (cached) return cached;

  const credentials = `${serverConfig.spotify_client_id}:${serverConfig.spotify_client_secret}`;

  const response = await fetch(serverConfig.spotify_token_url, {
    method: "POST",
    headers: {
      // Spotify wants the client pair as HTTP Basic, not as body params.
      Authorization: `Basic ${Buffer.from(credentials).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    cache.clear();
    // Status and which credential, never the body: that can echo credential detail,
    // and this lands in the host's logs. The label is what tells you whether it is the
    // panel that is about to go quiet or the lab that is about to refuse.
    throw new Error(`${label} token refresh failed: ${response.status}`);
  }

  const token = (await response.json()) as Spotify.TokenResponse;
  cache.write({
    value: token.access_token,
    ttl_ms: (token.expires_in ?? 3600) * 1000,
  });
  return token.access_token;
};

/** The read credential: now-playing, recently-played, top items, and search. */
export const getAccessToken = async (): Promise<string> =>
  exchange({
    refresh_token: serverConfig.spotify_refresh_token,
    cache: readTokenCache,
    label: "read",
  });

/**
 * The write credential: adding a track to the lab playlist, and nothing else.
 *
 * Throws rather than falling back to the read token when it is unset. A fallback would
 * turn a missing variable into a 403 from Spotify at the worst moment, and it would
 * quietly undo the reason there are two of these.
 */
export const getWriteAccessToken = async (): Promise<string> => {
  if (!hasWriteCredentials()) {
    throw new Error("write token not configured. See docs/suggest-setup.md.");
  }

  return exchange({
    refresh_token: serverConfig.spotify_write_refresh_token,
    cache: writeTokenCache,
    label: "write",
  });
};
