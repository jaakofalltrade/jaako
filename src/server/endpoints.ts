import "server-only";

/**
 * Spotify's Web API paths. Relative to serverConfig.spotify_api_url, never absolute.
 *
 * At the server root rather than inside spotify/, as the mirror of
 * src/client/endpoints.ts: one file per side of the boundary holding every URL that
 * side is allowed to know. Those are our own and the browser needs them; these are
 * upstream and the browser must never see them, which is also why this file carries
 * `server-only`. Anything else this server ever calls out to belongs here too.
 *
 * Nothing is imported here on purpose. The builders take every value they interpolate,
 * so this file knows URL shape and nothing else — how many recent plays to ask for is
 * the caller's business, and reading the call site tells you what it asked for.
 *
 * Constraints in the comments are Spotify's own, quoted from the OpenAPI schema at
 * developer.spotify.com/reference/web-api/open-api-schema.yaml. They are not enforced
 * here: a limit of 80 is a 400 from Spotify, not a type error.
 */

/**
 * What is on the player right now.
 *
 * NO `additional_types`. It used to carry `additional_types=track`, which the schema
 * says is a list of types the client supports "besides the default `track` type" —
 * so it asked for nothing and was a dead parameter on every request. The only value
 * it would do anything with is `episode`, and this panel does not render podcasts:
 * when one is playing Spotify answers with a null item, the service falls through to
 * recently-played, and the strip shows the last music instead. That is the intended
 * behaviour, so the parameter stays off.
 *
 * `market` is not passed either. A user access token carries the account's country
 * and the schema says that takes priority over the parameter, so sending one would
 * only be a second chance to send it wrong.
 *
 * Answers 204 with an empty body when nothing is playing. That is NOT in the schema —
 * only /me/player documents a 204 — but it happens, and getJson in
 * spotifyApiClient.ts handles it.
 */
export const currentlyPlaying = () => "/me/player/currently-playing";

/** `limit`: Spotify allows 1–50, default 20. Completed plays only; never the current track. */
export const recentlyPlayed = (args: { limit: number }) =>
  `/me/player/recently-played?limit=${args.limit}`;

/**
 * Top artists or tracks by affinity. Needs the user-top-read scope, which the two
 * player paths above do not — a token predating that scope gets a 403 here and a 200
 * there, which is why the two flows degrade separately.
 *
 * `time_range` is spelled out as a union rather than a string because the three
 * values are the whole vocabulary and a typo is otherwise a silent fallback to
 * Spotify's `medium_term` default. `long_term` is ~1 year of data, not all-time.
 *
 * `limit`: 1–50, default 20.
 */
export const topItems = (args: {
  type: "artists" | "tracks";
  time_range: "short_term" | "medium_term" | "long_term";
  limit: number;
}) => `/me/top/${args.type}?time_range=${args.time_range}&limit=${args.limit}`;

/**
 * The whole playlist in one request: the record AND the first page of what is on it.
 *
 * ONE CALL, NOT TWO, AND THAT IS THE OPTIMISATION WORTH KNOWING ABOUT. The playlist
 * object embeds its own items as a paging object, so asking for both in one projection
 * serves the header, the track count, the total runtime and the duplicate set together.
 * A playlist of a hundred tracks or fewer is a single request for the entire page.
 * Measured against the real one rather than assumed.
 *
 * `fields` IS THE INTERFACE, NOT A TUNING KNOB. Without it this returns every field of
 * every track. With it, ask for the wrong key and the response is a 200 carrying an
 * empty object, which is the quietest way this call can be wrong. Two keys are not what
 * the older documentation says: the paging field is `items` rather than `tracks`, and
 * inside it each entry holds the track under `item` rather than `track`.
 *
 * `limit` applies to the embedded page. Spotify allows 1-100.
 */
export const playlist = (args: { id: string; limit: number }) =>
  `/playlists/${args.id}?limit=${args.limit}&fields=` +
  "name,description,external_urls,images,owner(display_name)," +
  "items(total,next,items(added_at,item(uri,name,duration_ms,artists(name),album(name,images),external_urls)))";

/**
 * One further page, for a playlist longer than the embedded first one.
 *
 * `/items`, NOT `/tracks`: the tracks sub-path answers 403 Forbidden even to the owner
 * of a public playlist. The `next` field arrives as an absolute URL, so a caller
 * following it strips the API base first.
 */
export const playlistItems = (args: { id: string; limit: number }) =>
  `/playlists/${args.id}/items?limit=${args.limit}&fields=` +
  "total,next,items(added_at,item(uri,name,duration_ms,artists(name),album(name,images),external_urls))";

/**
 * Just the uris, for the duplicate check on the add path.
 *
 * A separate projection because it is asked for at a different moment and with a
 * different requirement: the page can be served a cached snapshot, and an add cannot,
 * or a track added a minute ago slips past as new. This answers in under a hundred
 * bytes for a short playlist, so paying for it uncached on every add is nothing.
 */
export const playlistTrackUris = (args: { id: string; limit: number }) =>
  `/playlists/${args.id}/items?limit=${args.limit}&fields=total,next,items(item(uri))`;

/**
 * Adding a track. POST, with the uris and the position in the body.
 *
 * Verified against the live API: this answers 201 with a snapshot_id, and `position: 0`
 * puts the track at the top, which is what keeps the playlist newest-first and the page
 * free of pagination. The `/tracks` equivalent answers 403.
 */
export const playlistAdd = (args: { id: string }) => `/playlists/${args.id}/items`;

/**
 * Which account the token belongs to.
 *
 * Read for one field. "My playlists" cannot be answered by the library path below on
 * its own — it returns followed playlists beside owned ones — so telling them apart
 * means comparing each playlist's owner id against the id of whoever this token is.
 *
 * A CONSTANT WOULD HAVE DONE AND IS WORSE. Hard-coding the account name means a
 * deployment whose credentials point somewhere else renders an empty shelf and gives
 * nobody a reason why: every playlist is filtered out for belonging to the wrong
 * person, silently, which is the same class of failure as a `fields` typo. Asking is
 * one request, cached for the life of the process, and it cannot drift.
 *
 * Needs no scope. The id and display name are public profile fields, and this answers
 * 200 on a token carrying nothing but the player scopes — measured, not assumed.
 */
export const profile = () => "/me";

/**
 * Every playlist on the account, one page at a time.
 *
 * NO `fields` PARAMETER, AND THAT IS NOT AN OMISSION. Spotify documents the projection
 * for the /playlists/{id} family only; this path ignores one, so the response arrives
 * whole. Sending a parameter that does nothing is how the next reader concludes it is
 * doing something.
 *
 * NO FILTER PARAMETER EITHER, WHICH IS THE THING WORTH KNOWING BEFORE READING THE
 * SERVICE. `limit` and `offset` are the only two this endpoint takes: there is no way
 * to ask Spotify for the public ones, or for the owned ones. Every playlist in the
 * library comes back and deepcutsLibrary.ts drops what does not belong on a public
 * page. So `total` in the response counts the library rather than the answer.
 *
 * 403 WITHOUT playlist-read-private, whatever the playlists' own visibility. The scope
 * buys the list, not the private entries on it; see SCOPE_SETS in
 * scripts/spotify-token.mjs.
 *
 * `limit`: Spotify allows 1-50, default 20.
 */
export const myPlaylists = (args: { limit: number; offset: number }) =>
  `/me/playlists?limit=${args.limit}&offset=${args.offset}`;

/**
 * Track search.
 *
 * `type` is required by the API, so restricting it to tracks is not an extra guard,
 * it is the only sensible value: episodes and shows have no place on a playlist of
 * songs. `limit`: 1-50.
 */
export const search = (args: { q: string; limit: number }) =>
  `/search?q=${encodeURIComponent(args.q)}&type=track&limit=${args.limit}`;

/**
 * One track, by id rather than uri.
 *
 * The add route reads this instead of trusting what the browser sent: a duration
 * arriving from the client is a number the client chose, and the ten-minute rule has to
 * hold against a caller that is not our own page.
 */
export const track = (args: { id: string }) => `/tracks/${args.id}`;

export const spotifyEndpoints = {
  currentlyPlaying,
  recentlyPlayed,
  topItems,
  playlist,
  playlistItems,
  playlistTrackUris,
  playlistAdd,
  search,
  track,
  profile,
  myPlaylists,
};
