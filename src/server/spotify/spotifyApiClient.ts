import "server-only";
import { SPOTIFY_TIMEOUT_MS } from "@/constants";
import { serverConfig } from "@/server/serverConfig";
import { Spotify } from "@/models";
import {
  getAccessToken,
  getWriteAccessToken,
  invalidateAccessToken,
} from "./spotifyAccessTokens";

/**
 * The authenticated HTTP client for the Spotify Web API. Every call this site makes to
 * api.spotify.com goes out through one of the two clients at the foot of this file.
 *
 * THE CREDENTIAL IS BOUND AT CONSTRUCTION, NOT PASSED PER CALL, and that is the point
 * of the factory. This used to be a single `spotifyFetch({ path, write: true })`, which
 * made every call site a place where the wrong credential could be spent. It also
 * contradicted spotifyAccessTokens.ts, which keeps its own exchange() private for
 * exactly that reason and hands out two named functions instead. Two clients rather
 * than one flag puts this file back in agreement with that one.
 *
 * The read client is what almost everything spends, including the public
 * unauthenticated search proxy. The write client is reached by one route.
 *
 * It also owns the JSON handling that used to be duplicated. listeningActivity.ts and
 * suggestPlaylist.ts each had a private get<T>, one checking for a 204 explicitly and
 * the other arriving at the same answer sideways, because a 204 is a 2xx whose body is
 * empty and an empty body already returned null. Identical behaviour written twice, and
 * only one copy said why. There is one now, and it says why.
 */

/**
 * IT EXISTS FOR ONE BEHAVIOUR: a 401 is retried once with a freshly minted token.
 *
 * An access token lives an hour and the cache in spotifyAccessTokens.ts holds it for
 * slightly less, which is correct arithmetic and not the only way one dies. Spotify
 * invalidates previously issued access tokens when the account re-authorises the
 * application, so minting a new token anywhere kills every cached one elsewhere while
 * its clock still says it has forty minutes left.
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
const send = async (args: {
  credential: Spotify.Credential;
  path: string;
  init?: RequestInit;
  fresh: boolean;
}): Promise<Response> => {
  const { credential, path, init, fresh } = args;
  const write = credential === Spotify.Credential.Write;

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
    /* A REQUEST THAT NEVER ANSWERS USED TO WAIT FOREVER, and after /lab/suggest started
       streaming that stopped being invisible. Every read in this folder is wrapped in a
       try/catch that turns a failure into a quiet offline shape, so an error has always
       been handled - but a fetch that simply never settles is not an error. It is a
       promise nobody resolves, and the Suspense boundary above it sits on its skeleton
       until the runtime's own default gives up, minutes later.
       Last after the spread on purpose: no caller passes a signal today, and if one
       ever does, this is the line to reconcile rather than the one to quietly lose. */
    signal: AbortSignal.timeout(SPOTIFY_TIMEOUT_MS),
  });
};

const request = async (args: {
  credential: Spotify.Credential;
  path: string;
  init?: RequestInit;
}): Promise<Response> => {
  const first = await send({ ...args, fresh: false });
  if (first.status !== 401) return first;

  return send({ ...args, fresh: true });
};

/**
 * One client per credential.
 *
 * The same shape as createTokenCache in spotifyAccessTokens.ts, and instantiated the
 * same way: a factory called once per credential rather than a singleton with a flag.
 * Nothing here needs registering and there is no init step, because the two instances
 * below are built at module load in the file that exports them.
 */
const createSpotifyApiClient = (args: { credential: Spotify.Credential }) => {
  const { credential } = args;

  return {
    /**
     * A GET whose body is JSON, or nothing.
     *
     * Null covers two different quiet answers and both are ordinary: a 204, which is
     * what /me/player/currently-playing sends when nothing is playing and which
     * carries no body at all, and a 200 with an empty body. Calling .json() on either
     * throws, so the text is checked before it is parsed.
     *
     * The cast is a cast. Nothing validates the bytes against T, which is why the
     * response types in models/Spotify.ts declare almost every field optional: the
     * mappers cannot read a field without checking it first, so the assertion here
     * cannot be believed downstream.
     */
    getJson: async <T>(args: { path: string }): Promise<T | null> => {
      const { path } = args;

      const response = await request({ credential, path });

      if (response.status === 204) return null;
      if (!response.ok)
        throw new Error(`GET ${path} failed: ${response.status}`);

      const text = await response.text();
      return text ? (JSON.parse(text) as T) : null;
    },

    /**
     * A POST with a JSON body, for the one route that writes.
     *
     * Returns nothing. Spotify answers the add with a snapshot_id that this site has
     * never had a use for, and reading it would only invite somebody to depend on it.
     * Throws on failure, and the caller decides what a failure costs.
     */
    post: async (args: { path: string; body: unknown }): Promise<void> => {
      const { path, body } = args;

      const response = await request({
        credential,
        path,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      });

      if (!response.ok)
        throw new Error(`POST ${path} failed: ${response.status}`);
    },
  };
};

/** Now-playing, recently-played, top items, search, and every playlist read. */
export const spotifyRead = createSpotifyApiClient({
  credential: Spotify.Credential.Read,
});

/** Adding a track to the lab playlist, and nothing else. */
export const spotifyWrite = createSpotifyApiClient({
  credential: Spotify.Credential.Write,
});
