import "server-only";
import { serverConfig } from "@/server/serverConfig";
import { getAccessToken, getWriteAccessToken, invalidateAccessToken } from "./auth";

/**
 * Every request this site makes to Spotify goes through here.
 *
 * IT EXISTS FOR ONE BEHAVIOUR: a 401 is retried once with a freshly minted token.
 *
 * An access token lives an hour and the cache in auth.ts holds it for slightly less,
 * which is correct arithmetic and not the only way one dies. Spotify invalidates
 * previously issued access tokens when the account re-authorises the application, so
 * minting a new token anywhere kills every cached one elsewhere while its clock still
 * says it has forty minutes left.
 *
 * That is not hypothetical. Approving the write scope for /lab/suggest revoked the
 * token a warm server was holding, and because nothing cleared the cache on a
 * rejection, every read answered 401 until the process was restarted. The homepage
 * panel would have gone quiet for an hour in production and recovered on its own,
 * which is the kind of fault nobody ever finds the cause of.
 *
 * ONE RETRY, NOT A LOOP. A second 401 means the credential is genuinely wrong -
 * revoked at the account, or a rotated client secret - and hammering the token
 * endpoint would turn a broken deployment into a rate-limited one.
 */
const request = async (args: {
  path: string;
  init?: RequestInit;
  write: boolean;
  fresh: boolean;
}): Promise<Response> => {
  const { path, init, write, fresh } = args;

  if (fresh) invalidateAccessToken({ write });
  const token = write ? await getWriteAccessToken() : await getAccessToken();

  return fetch(`${serverConfig.spotify_api_url}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
    // Every cache in this folder has its own TTL and its own reasons. A second one
    // underneath, that none of them can see, would make staleness two numbers.
    cache: "no-store",
  });
};

export const spotifyFetch = async (args: {
  path: string;
  init?: RequestInit;
  /** True for the one route that adds a track. Decides which credential is spent. */
  write?: boolean;
}): Promise<Response> => {
  const { path, init, write = false } = args;

  const first = await request({ path, init, write, fresh: false });
  if (first.status !== 401) return first;

  return request({ path, init, write, fresh: true });
};
