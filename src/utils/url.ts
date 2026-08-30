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
}): string | T =>
  fromHostList({ url: args.url, hosts: [args.host], suffixes: [], fallback: args.fallback });

/**
 * The same check against several hosts, and against domain suffixes.
 *
 * Spotify forced this. Album art is always on i.scdn.co, which one exact host covers,
 * but a playlist's custom COVER comes back on spotifycdn.com with a rotating
 * subdomain: the same image answered as image-cdn-ak.spotifycdn.com and
 * image-cdn-fa.spotifycdn.com on two consecutive requests. An exact list cannot hold
 * that, and the alternative was allowing any host, which is the check being removed
 * rather than widened.
 *
 * A SUFFIX MUST BEGIN WITH A DOT, and that is the whole safety of this function.
 * Matching ".spotifycdn.com" cannot be satisfied by "evilspotifycdn.com", because that
 * hostname does not contain the dot before the label. Matching "spotifycdn.com"
 * without one would let exactly that through, which is the same class of mistake as
 * checking a URL with startsWith. Suffixes are asserted rather than trusted: one that
 * does not start with a dot matches nothing at all.
 */
export const fromHostList = <T>(args: {
  url: string | undefined;
  /** Exact hostnames. */
  hosts: readonly string[];
  /** Domain suffixes, each beginning with a dot. */
  suffixes: readonly string[];
  fallback: T;
}): string | T => {
  const { url, hosts, suffixes, fallback } = args;
  if (!url) return fallback;

  let hostname: string;
  try {
    // javascript: and data: URLs parse with an empty hostname rather than throwing,
    // so they fail every comparison below without needing a scheme check.
    hostname = new URL(url).hostname;
  } catch {
    return fallback;
  }

  if (hosts.includes(hostname)) return url;

  const allowed = suffixes.some(
    (suffix) => suffix.startsWith(".") && hostname.endsWith(suffix)
  );

  return allowed ? url : fallback;
};
