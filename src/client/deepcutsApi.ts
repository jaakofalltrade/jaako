import { endpoints } from "@/client/endpoints";
import type { PackContents, RipResponse } from "@/models";

/**
 * The browser's call to our own deepcuts route.
 *
 * The only module that knows this route exists, like spotifyApi.ts beside it: the panel
 * asks for a pack's contents and gets a shape back, never a URL.
 *
 * IT THROWS, WHICH THE SPOTIFY CALLS DO NOT, and the difference is what the caller can
 * do about a failure. Those two feed a decorative widget with a real offline state, so
 * swallowing an error there IS the design. This one fills a panel somebody has just
 * opened by clicking: there is no useful "offline pack", and a panel that opens empty
 * and says nothing is worse than one that says it could not read.
 */
export const fetchPack = async (args: {
  playlist_id: string;
  signal?: AbortSignal;
}): Promise<PackContents> => {
  const { playlist_id, signal } = args;

  const response = await fetch(
    `${endpoints.lab.deepcuts.pack}?id=${encodeURIComponent(playlist_id)}`,
    /* No cache:"no-store". A pack's contents are a playlist plus six-hour-old play
       counts, so letting the browser reuse a response while somebody opens the same
       pack twice is right. */
    { signal }
  );

  if (!response.ok) throw new Error(`pack ${response.status}`);

  return (await response.json()) as PackContents;
};

/**
 * Opens a pack.
 *
 * POST, because a rip mints a visitor id and writes rows. It is still idempotent for the
 * day - the draw is seeded, so posting twice deals the same five cards - but the tally
 * is not, and a GET would be fetched by every prefetcher that saw the URL.
 *
 * Returns the body on a refusal as well as a success, because the route puts a sentence
 * written for the visitor in `error` and that sentence is the whole point of the refusal.
 * Only a response that is not JSON at all throws.
 */
export const ripPack = async (args: {
  playlist_id: string;
  signal?: AbortSignal;
}): Promise<RipResponse> => {
  const { playlist_id, signal } = args;

  const response = await fetch(
    `${endpoints.lab.deepcuts.rip}?id=${encodeURIComponent(playlist_id)}`,
    { method: "POST", signal }
  );

  return (await response.json()) as RipResponse;
};
