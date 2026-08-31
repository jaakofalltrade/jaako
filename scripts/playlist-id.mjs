/**
 * Turns a Spotify playlist link into the id that goes in SPOTIFY_PLAYLIST_ID.
 *
 *     pnpm playlist:id https://open.spotify.com/playlist/2CK3Ap0UNSCwatm9cIijx2?si=abc
 *
 * This exists because the interesting part of the URL is surrounded by two things that
 * look like they belong to it and do not. `?si=` is a SHARE TOKEN — Spotify stamps it
 * on a copied link to attribute the click, it differs every time the same playlist is
 * copied, and pasting it into the variable produces an id that 404s. Some links also
 * carry a locale segment, /intl-de/playlist/..., which moves the id one place along.
 * Both are easy to miss by eye and neither fails loudly: a wrong id is a playlist that
 * simply does not load.
 *
 * OFFLINE AND READ-ONLY. It parses a string and prints a string. No credential, no
 * request, nothing written — so it costs nothing to run on a link you are not sure
 * about, and it cannot be the reason anything changed.
 *
 * It does NOT check the playlist exists, which is the one thing it cannot do without a
 * token. A well-formed id for a deleted playlist passes here and fails at runtime.
 */

/**
 * Base62, exactly 22 characters. Spotify's own id length across every resource type,
 * and anchored, so a share token or a trailing slash cannot be mistaken for one.
 *
 * The same shape TRACK_URI pins in src/server/spotify/mappers.ts. Kept as its own copy
 * rather than imported: that file is TypeScript behind the `@/` alias and carries
 * `server-only`, neither of which a plain node script can reach.
 */
const PLAYLIST_ID = /^[A-Za-z0-9]{22}$/;

/** `spotify:playlist:<id>`, which is what the desktop client's "Copy Spotify URI" gives. */
const PLAYLIST_URI = /^spotify:playlist:([A-Za-z0-9]{22})$/;

/**
 * Pulls the id out of whatever form the link arrived in.
 *
 * Returns null rather than throwing, so the caller owns the message. Every branch ends
 * at the same anchored test, which is what stops a locale segment or a share token
 * being returned as an id.
 */
export const playlistId = (input) => {
  const value = String(input ?? "").trim();
  if (!value) return null;

  // Already just the id. Idempotent on purpose: running this on its own output is a
  // no-op rather than an error, which matters when it is pasted into a script.
  if (PLAYLIST_ID.test(value)) return value;

  const uri = value.match(PLAYLIST_URI);
  if (uri) return uri[1];

  let url;
  try {
    url = new URL(value);
  } catch {
    return null; // Not an id, not a uri, not a URL. Nothing left it could be.
  }

  // Parsed rather than regexed, so the query string is dropped by the URL class instead
  // of by a pattern that has to remember it exists. `?si=` never reaches this.
  const segments = url.pathname.split("/").filter(Boolean);

  // Found by position relative to "playlist" rather than by index, which is what makes
  // the /intl-de/ prefix a non-event instead of an off-by-one.
  const marker = segments.indexOf("playlist");
  const candidate = marker === -1 ? null : segments[marker + 1];

  return candidate && PLAYLIST_ID.test(candidate) ? candidate : null;
};

/* Importable for a test without running the CLI: node runs this block only when the
   file is the entry point, not when something imports playlistId from it. */
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("playlist-id.mjs")) {
  const [input] = process.argv.slice(2);

  if (!input) {
    console.error("Usage: pnpm playlist:id <playlist url, spotify uri, or id>");
    process.exit(1);
  }

  const id = playlistId(input);

  if (!id) {
    console.error(`Not a Spotify playlist link: ${input}`);
    console.error("Expected open.spotify.com/playlist/<id>, spotify:playlist:<id>, or a bare 22-character id.");
    process.exit(1);
  }

  console.log(`\n  id   ${id}`);
  console.log(`  url  https://open.spotify.com/playlist/${id}`);
  console.log(`\n  SPOTIFY_PLAYLIST_ID=${id}\n`);
}
