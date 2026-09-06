import { endpoints } from "@/client/endpoints";
import type { CollectedCard, CollectionResponse, PackContents, RipResponse } from "@/models";

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

/**
 * Every card this browser has pulled.
 *
 * NO ARGUMENT FOR WHO IS ASKING, and that absence is the point: the route reads the
 * visitor cookie, which the browser attaches on its own and no script can read. A
 * visitor id in this signature would be a visitor id in a URL, which is an enumeration
 * of everybody's collections.
 *
 * SWALLOWS, WHERE fetchPack THROWS. The distinction the header draws is what the caller
 * can do about a failure, and the collection tab is a page of cards that either has cards
 * on it or does not. An empty binder is already a state it renders - it is what every
 * browser that has never opened a pack sees - so a failed read collapsing into the same
 * empty list costs a visitor nothing they could act on.
 *
 * `no-store`, because a collection changes the moment a pack is opened and this is
 * refetched precisely when the reader has come to look at it.
 */
export const fetchCollection = async (args?: { signal?: AbortSignal }): Promise<CollectedCard[]> => {
  try {
    const response = await fetch(endpoints.lab.deepcuts.cards, {
      cache: "no-store",
      signal: args?.signal,
    });

    if (!response.ok) return [];

    return ((await response.json()) as CollectionResponse).cards;
  } catch (error) {
    // An abort is a caller tidying up, not a failure worth logging.
    if (args?.signal?.aborted) return [];
    console.error("[deepcuts] collection failed:", error);
    return [];
  }
};
