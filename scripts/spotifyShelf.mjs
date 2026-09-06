/**
 * The playlists a pack could come out of, read straight from Spotify.
 *
 * SHARED BY TWO SCRIPTS RATHER THAN COPIED INTO BOTH. lastfm-check.mjs prints this list
 * so you can pick an id off it; ladder-spread.mjs walks it to sample the catalogue. The
 * filter is the interesting part - own, public, de-duplicated - and a second copy of it
 * is a second thing to get wrong, in a place where getting it wrong means a script
 * reporting on somebody else's playlists.
 *
 * IT IS NOT THE APP'S FILTER AND CANNOT BE. src/server/spotify/deepcutsLibrary.ts carries
 * `server-only` and lives behind the `@/` alias, neither of which a plain node script can
 * reach. What it can do is stay honest about the difference: this one does NOT drop the
 * suggestion-box playlists, because a script measuring the shape of the catalogue wants
 * every song on the account, and the app's exclusion is about what a visitor may be dealt.
 *
 * Read-only. A refresh token, three GETs, and nothing written anywhere.
 */

const bail = (message) => {
  console.error(message);
  process.exit(1);
};

/** A fresh access token from the refresh token in .env.local. */
const accessToken = async () => {
  const {
    SPOTIFY_CLIENT_ID: id,
    SPOTIFY_CLIENT_SECRET: secret,
    SPOTIFY_REFRESH_TOKEN: refresh,
  } = process.env;

  if (!id || !secret || !refresh) bail("Spotify credentials are not set. See .env.local.");

  const auth = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });

  if (!auth.ok) bail(`Spotify token refresh failed: ${auth.status}`);
  return (await auth.json()).access_token;
};

/**
 * Every public playlist on the account, biggest first.
 *
 * `items.total` rather than `tracks.total`: the SIMPLIFIED playlist object that
 * /me/playlists returns spells the count that way, which the app's mappers found the
 * hard way and this has to match or every playlist reports zero tracks.
 */
export const listOwnPublicPlaylists = async () => {
  const token = await accessToken();
  const headers = { Authorization: `Bearer ${token}` };

  const me = await fetch("https://api.spotify.com/v1/me", { headers });
  if (!me.ok) bail(`GET /me failed: ${me.status}`);
  const owner = (await me.json()).id;

  const found = [];
  for (let page = 0; page < 10; page += 1) {
    const response = await fetch(
      `https://api.spotify.com/v1/me/playlists?limit=50&offset=${page * 50}`,
      { headers }
    );

    if (response.status === 403) {
      bail(
        "403 from /me/playlists. The read token is missing playlist-read-private.\n" +
          "Re-mint it with: pnpm token:read"
      );
    }
    if (!response.ok) bail(`GET /me/playlists failed: ${response.status}`);

    const body = await response.json();
    const items = body.items ?? [];
    found.push(...items);

    if (!body.next || items.length < 50) break;
  }

  return found
    .filter((playlist) => playlist?.owner?.id === owner && playlist?.public === true)
    /* Offset paging over this collection repeats itself - two duplicates in 199 on this
       account - and the app hit the same thing as a React duplicate-key warning. */
    .filter((playlist, index, all) => all.findIndex((p) => p.id === playlist.id) === index)
    .map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      total: playlist.items?.total ?? 0,
    }))
    .sort((a, b) => b.total - a.total);
};
