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
 * only /me/player documents a 204 — but it happens, and request.ts handles it.
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
 * One playlist's own record: name, description, cover, owner, and the item count.
 *
 * `fields` IS NOT AN OPTIMISATION HERE, IT IS THE INTERFACE. Without it this returns
 * the first hundred items inline, which is a large payload for a header that needs six
 * strings. With it, ask for the wrong key and the response is a 200 carrying an empty
 * object — so the projection below is part of the contract and not a tuning knob.
 *
 * THE COUNT IS UNDER `items`, NOT `tracks`. That is measured against the live API,
 * not read from documentation: `fields=tracks(total)` answers 200 with the field
 * simply absent, which is the quietest way this call can be wrong.
 */
export const playlist = (args: { id: string }) =>
  `/playlists/${args.id}?fields=` +
  "name,description,external_urls,images,owner(display_name),followers(total),items(total)";

/**
 * One page of what is on it.
 *
 * `/items`, NOT `/tracks`. The tracks sub-path answers 403 Forbidden even to the
 * owner of a public playlist, which reads as a permissions problem and is not one.
 *
 * The track hangs off `item` inside each entry, so the projection says item(...) and
 * a projection saying track(...) comes back empty without complaining.
 *
 * `limit`: Spotify allows 1–100. The response carries `next` as an absolute URL, so
 * a caller paging through strips the API base before passing it back here.
 */
export const playlistItems = (args: { id: string; limit: number }) =>
  `/playlists/${args.id}/items?limit=${args.limit}&fields=` +
  "total,next,items(added_at,item(uri,name,duration_ms,artists(name),album(name,images),external_urls))";

/**
 * The same page, asking for durations and nothing else.
 *
 * A playlist's total runtime is not a field Spotify has: the only way to it is to sum
 * every track, which means every page. This projection makes that cheap — a hundred
 * items come back as a hundred integers — so the sum costs bandwidth proportional to
 * the count rather than to the catalogue.
 */
export const playlistDurations = (args: { id: string; limit: number }) =>
  `/playlists/${args.id}/items?limit=${args.limit}&fields=total,next,items(item(duration_ms))`;

export const spotifyEndpoints = {
  currentlyPlaying,
  recentlyPlayed,
  topItems,
  playlist,
  playlistItems,
  playlistDurations,
};
