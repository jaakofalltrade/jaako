import { endpoints } from "@/client/endpoints";
import { DEEPCUTS_TEASER } from "@/data/lab";
import type { CollectedCard, CollectionResponse, Result, RipResponse } from "@/models";

/**
 * Every call the browser makes to our own API, and the only module that knows they are
 * HTTP at all.
 *
 * ONE PLACE THAT FETCHES. Callers say `remoteService.rip({ playlist_id })` and get a value
 * back. They never see a URL, a method, a status code or a JSON parse - so a route that
 * moves, or a response shape that changes, is an edit here and nowhere else.
 *
 * NOTHING THROWS PAST THIS FILE, which is the second half of the same idea. Every call
 * returns a Result: `{ ok: true, data }` or `{ ok: false, error }`, where `error` is a
 * sentence already written for a visitor rather than an exception message. A caller cannot
 * reach the data without having handled the failure, because TypeScript will not let it -
 * which is what makes "errors are caught at the lower level" a rule the compiler enforces
 * instead of a convention somebody has to remember.
 *
 * It replaced two functions that disagreed on purpose: one threw on a bad response and the
 * other swallowed everything and returned an empty array. Both readings were defensible in
 * isolation and having both was the problem.
 *
 * NATIVE fetch, NOT axios, AND THAT IS A DELIBERATE NON-PURCHASE. What axios would buy is
 * interceptors, automatic JSON, real timeouts and a richer error object. `request` below
 * is all four in forty lines, for a client that talks to one origin and three endpoints.
 * docs/lab.md counts runtime dependencies as a discipline; this is not the place to spend
 * one. If retries or auth headers ever arrive, `request` is the single body to swap and no
 * call site changes.
 */

/** Long enough for a cold pack to be scored against last.fm, short enough to give up. */
const TIMEOUT_MS = 20_000;

/**
 * The one function that talks to the network.
 *
 * ABORT IS NOT A FAILURE. A caller that unmounts cancels its own request, and reporting
 * that back as an error would put "something went wrong" on screen for somebody who
 * navigated away. It comes back as a failure with no sentence, so a caller that is still
 * mounted shows nothing rather than an apology.
 */
const request = async <T>(args: {
  path: string;
  method?: "GET" | "POST";
  query?: Record<string, string>;
  /** What a visitor should read if this does not work. */
  error: string;
  signal?: AbortSignal;
}): Promise<Result<T>> => {
  const { path, method = "GET", query, error, signal } = args;

  const url = query ? `${path}?${new URLSearchParams(query).toString()}` : path;

  /* Our own timeout, combined with the caller's abort. Without one, a hung request leaves
     a spinner up forever; without the caller's, an unmounted component keeps a socket. */
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  try {
    const response = await fetch(url, { method, signal: combined });

    /* THE BODY IS READ ON A REFUSAL TOO, because some routes put the reason in it. The rip
       answers 429 with a sentence written for the visitor, and throwing that away to
       report the status code would replace the useful message with a useless one. */
    const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;

    if (!response.ok || body === null) {
      return { ok: false, error: body?.error ?? error };
    }

    return { ok: true, data: body };
  } catch (cause) {
    if (signal?.aborted) return { ok: false, error: "" };

    console.error(`[remote] ${method} ${path} failed:`, cause);
    return { ok: false, error };
  }
};

export const remoteService = {
  /**
   * Fills the play-count cache for a playlist. Fire and forget.
   *
   * Returns nothing at all, not even a Result: the caller is a pointer entering a pack on
   * the shelf, and there is no outcome it could act on. A failure means the rip does the
   * scoring itself a moment later, which is the behaviour without this call.
   */
  warmPack: (args: { playlist_id: string }): void => {
    void request({
      path: endpoints.lab.deepcuts.warm,
      query: { id: args.playlist_id },
      error: "",
    });
  },

  /**
   * Opens a pack.
   *
   * POST, because a rip mints a visitor id and writes rows. It is still idempotent for the
   * day - the draw is seeded, so posting twice deals the same five cards - but the tally
   * is not, and a GET would be fetched by every prefetcher that saw the URL.
   */
  rip: (args: {
    playlist_id: string;
    /** Local-only preview switch; the route ignores it anywhere else. */
    shiny?: boolean;
    signal?: AbortSignal;
  }): Promise<Result<RipResponse>> =>
    request<RipResponse>({
      path: endpoints.lab.deepcuts.rip,
      method: "POST",
      query: args.shiny
        ? { id: args.playlist_id, shiny: "1" }
        : { id: args.playlist_id },
      error: DEEPCUTS_TEASER.rip_failed,
      signal: args.signal,
    }),

  /** Every card this browser has pulled, rarest first. */
  collection: async (args?: { signal?: AbortSignal }): Promise<Result<CollectedCard[]>> => {
    const answer = await request<CollectionResponse>({
      path: endpoints.lab.deepcuts.cards,
      error: DEEPCUTS_TEASER.collection_failed,
      signal: args?.signal,
    });

    return answer.ok ? { ok: true, data: answer.data.cards } : answer;
  },
};
