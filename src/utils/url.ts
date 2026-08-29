/**
 * URL checks.
 *
 * Pure and dependency-free: this decides whether a string is allowed somewhere, and
 * knows nothing about what it is allowed into.
 */

/**
 * The URL if it is served from `host`, and `fallback` otherwise.
 *
 * Every URL the site renders that it did not write itself comes from Spotify, and
 * both of the places that took one were doing this same parse-and-compare with
 * different hosts and different fallbacks. The comparison is on `hostname`, so it is
 * exact: a suffix like `open.spotify.com.example.test` has a different hostname and
 * does not pass, which is the trick a `startsWith` or `includes` check would miss.
 *
 * Everything unparseable takes the fallback, and that covers more than typos.
 * `javascript:` and `data:` URLs parse with an empty hostname rather than throwing,
 * so they fail the comparison without needing a scheme check of their own.
 *
 * Generic in the fallback so a caller can pick the type of "no": null when the value
 * feeds an optional field, another URL when something has to render.
 */
export const fromHost = <T>(args: {
  url: string | undefined;
  host: string;
  fallback: T;
}): string | T => {
  const { url, host, fallback } = args;
  if (!url) return fallback;

  try {
    return new URL(url).hostname === host ? url : fallback;
  } catch {
    return fallback;
  }
};
