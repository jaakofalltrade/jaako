import { endpoints } from "@/client/endpoints";
import { SUGGEST_MESSAGE } from "@/constants";
import { SuggestFailure } from "@/models";
import type { AddRequest, AddResponse, SearchResponse } from "@/models";
import { getJson } from "@/utils/getJson";

/**
 * The browser's calls to our own suggest routes.
 *
 * The only module that knows these routes exist. Components ask for data and get a
 * response shape back; they never see a URL, a fetch or a parse. Same contract as
 * client/spotifyApi.ts.
 *
 * THE TWO CALLS DO NOT SHARE A HELPER, AND THAT IS THE SAME SPLIT getJson's OWN HEADER
 * DESCRIBES. Search is a read where every failure means the same thing, so it goes
 * through getJson and renders an empty list. The add carries a sentence the visitor is
 * meant to read on a 400, a 409 and a 429 alike, and routing it through a helper that
 * only parses successful responses would replace all of them with a generic network
 * line and throw away the real reason.
 */

const search = async (args: { q: string; signal?: AbortSignal }): Promise<SearchResponse> => {
  const { q, signal } = args;

  return getJson({
    url: `${endpoints.lab.suggest.search}?q=${encodeURIComponent(q)}`,
    fallback: { results: [] },
    // No cache:"no-store". Identical queries are already served from a cache on the
    // server with a TTL this app controls; letting the browser keep one too would make
    // staleness two numbers.
    init: { signal },
  });
};

const add = async (args: { request: AddRequest }): Promise<AddResponse> => {
  try {
    const response = await fetch(endpoints.lab.suggest.add, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args.request),
    });

    return (await response.json()) as AddResponse;
  } catch {
    // The request never reached the route at all, so there is no sentence from the
    // server to show and this is the only place the client writes one.
    return { added: false, error: SUGGEST_MESSAGE[SuggestFailure.SpotifyFailed] };
  }
};

export const suggestApi = {
  search,
  add,
};
