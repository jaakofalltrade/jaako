/**
 * Spotify's scope strings, named once.
 *
 * WHY THIS IS IN scripts/ AND NOT IN src/models. A scope is a value only two things ever
 * hold: the script that mints a token and the script that checks one. Every mention in
 * the app is a sentence in a comment explaining why an endpoint needs one - nothing under
 * src/ compares a scope, sends a scope, or branches on one. A TypeScript enum over there
 * would be a type no shipped code could use, mirrored by a literal list over here that a
 * plain node script can actually import, and the two would drift the first time a scope
 * changed. One source, in the folder that uses it.
 *
 * THEY WERE LOOSE STRINGS IN TWO FILES, which is the thing this fixes: spotify-token.mjs
 * requested them as one space-joined string and token-scopes.mjs listed them again as an
 * array to check against. A typo in either is not an error - it is a token that mints
 * successfully and then 403s at runtime, or a check that passes while claiming to have
 * verified a scope it misspelled.
 *
 * SETS ARE INTENT, NOT ENFORCEMENT. Spotify grants scopes per (user, application) rather
 * than per token, so approving the write scope once means every later token for this app
 * can carry it. Splitting them is still worth doing: it keeps the read token's REQUEST
 * honest, and it is what the check reports against.
 */

/** Every scope this project ever asks for, so a typo is a missing key rather than a 403. */
export const SpotifyScope = Object.freeze({
  /** The now-playing dock on the homepage. */
  ReadCurrentlyPlaying: "user-read-currently-playing",
  /** What fills the dock when nothing is playing. */
  ReadRecentlyPlayed: "user-read-recently-played",
  /** Top artists and tracks, for the listening statistics. */
  ReadTop: "user-top-read",
  /**
   * Listing playlists AT ALL, not merely the private ones.
   *
   * Measured, because the name says otherwise: GET /me/playlists answers 403 without it,
   * and so does /users/{id}/playlists - even for playlists that are public and open in a
   * browser with no account. The scope is what Spotify charges for a list; filtering that
   * list down to the public ones is ours to do, and deepcutsLibrary does it.
   */
  ReadPlaylistPrivate: "playlist-read-private",
  /** Adding a track to the lab playlist. The only write this project makes. */
  ModifyPlaylistPublic: "playlist-modify-public",
});

/**
 * What each refresh token is for, and which scopes it should carry.
 *
 * Keyed by the environment variable the token lives in, so the minting script and the
 * checking script agree on the name as well as on the contents.
 *
 * playlist-read-COLLABORATIVE is never requested, for the same reason
 * playlist-modify-private is not: nothing here has a use for it.
 */
export const SPOTIFY_TOKENS = Object.freeze({
  read: Object.freeze({
    variable: "SPOTIFY_REFRESH_TOKEN",
    label: "read  (now-playing, statistics, lab search, deepcuts library)",
    scopes: Object.freeze([
      SpotifyScope.ReadCurrentlyPlaying,
      SpotifyScope.ReadRecentlyPlayed,
      SpotifyScope.ReadTop,
      SpotifyScope.ReadPlaylistPrivate,
    ]),
  }),
  write: Object.freeze({
    variable: "SPOTIFY_WRITE_REFRESH_TOKEN",
    label: "write (adding a track to the lab playlist)",
    scopes: Object.freeze([SpotifyScope.ModifyPlaylistPublic]),
  }),
});
