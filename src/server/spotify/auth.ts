import "server-only";
import { TOKEN_EXPIRY_MARGIN_MS } from "@/constants";
import { serverConfig } from "@/server/serverConfig";
import { Spotify } from "@/models";

/**
 * The client-credentials half of the Spotify integration: is it wired up, and what
 * bearer token do we send.
 *
 * Its own file because it is the only part of this folder that touches a secret.
 * Everything else here handles data that has already come back.
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

const tokenCache = createTokenCache();

/** False on a fresh clone or a host with a forgotten variable — the panel degrades instead of throwing. */
export const hasCredentials = (): boolean =>
  Boolean(
    serverConfig.spotify_client_id &&
      serverConfig.spotify_client_secret &&
      serverConfig.spotify_refresh_token
  );

export const getAccessToken = async (): Promise<string> => {
  const cached = tokenCache.read();
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
      refresh_token: serverConfig.spotify_refresh_token,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    tokenCache.clear();
    // Status only. The response body can echo credential detail, and this lands
    // in the host's logs.
    throw new Error(`token refresh failed: ${response.status}`);
  }

  const token = (await response.json()) as Spotify.TokenResponse;
  tokenCache.write({
    value: token.access_token,
    ttl_ms: (token.expires_in ?? 3600) * 1000,
  });
  return token.access_token;
};
