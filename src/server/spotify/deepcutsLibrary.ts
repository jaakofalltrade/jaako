import "server-only";
import { LIBRARY_MAX_PAGES, LIBRARY_READ_LIMIT, LIBRARY_TTL_MS } from "@/constants";
import { Spotify } from "@/models";
import type { DeepcutsLibrary } from "@/models";
import { getEpochMilliseconds } from "@/oras/milliseconds";
import { spotifyEndpoints } from "@/server/endpoints";
import { uniqueBy } from "@/utils/collection";
import { hasCredentials } from "./spotifyAccessTokens";
import { spotifyRead } from "./spotifyApiClient";
import { toDeepcutsPlaylist } from "./mappers";

/**
 * The playlists a pack could be dealt from: /lab/deepcuts' shelf.
 *
 * The third module in this folder, and separate from the other two for the reason
 * index.ts gives about those: it answers to its own page and fails on its own. The
 * homepage panel going quiet does not empty this shelf, and this shelf going quiet does
 * not touch the suggest playlist.
 *
 * SIBLING TO suggestPlaylist.ts AND ALMOST ITS OPPOSITE. That one reads ONE playlist,
 * named by an id in config, in full — every track, every duration. This reads EVERY
 * playlist, named by nothing, in outline — a cover, a name and a count each. They share
 * the client and the mappers and nothing else, and merging them would mean one function
 * with a flag deciding which of two unrelated shapes to build.
 *
 * NOTHING HERE SCORES ANYTHING, WHICH IS THE WHOLE OF WHAT IS NOT BUILT YET. The pack
 * rip needs a play count per track, Spotify does not have one, and docs/lab.md settles
 * on Last.fm for it. This file is the Spotify half and it is finished: it says which
 * playlists exist. The rung a card lands on is a second upstream's problem.
 */

/**
 * Which account the read token belongs to, held for the life of the process.
 *
 * NO TTL, DELIBERATELY, AND IT IS THE ONLY CACHE IN THIS FOLDER WITHOUT ONE. The others
 * hold data that changes — a track count, an access token with an hour on it. This
 * holds the identity behind a refresh token, and a refresh token that started answering
 * with a different account is not a value gone stale, it is a credential that was
 * replaced, which means a deployment that restarted anyway.
 */
const createProfileCache = () => {
  let cached: string | null = null;

  return {
    read: (): string | null => cached,
    write: (value: string) => {
      cached = value;
    },
  };
};

const profileCache = createProfileCache();

/** The account id, or null when Spotify would not say. */
const ownerId = async (): Promise<string | null> => {
  const cached = profileCache.read();
  if (cached) return cached;

  const profile = await spotifyRead.getJson<Spotify.ProfileResponse>({
    path: spotifyEndpoints.profile(),
  });

  if (!profile?.id) return null;

  profileCache.write(profile.id);
  return profile.id;
};

/**
 * The shelf, held in module scope.
 *
 * Per-instance, like every other cache here: a cold cache costs a request, which is the
 * right thing to be wrong about. Nothing invalidates this one the way an add clears the
 * suggest snapshot, because nothing in this process ever changes a playlist — the shelf
 * only moves when jaako makes one somewhere else, and a quarter of an hour behind is
 * close enough for a list of names.
 */
const createLibraryCache = () => {
  let cached: { value: DeepcutsLibrary; expires_at: number } | null = null;

  return {
    read: (): DeepcutsLibrary | undefined =>
      cached && cached.expires_at > getEpochMilliseconds.now() ? cached.value : undefined,
    write: (value: DeepcutsLibrary) => {
      cached = { value, expires_at: getEpochMilliseconds.now() + LIBRARY_TTL_MS };
    },
  };
};

/* UNDEFINED IS THE MISS AND NULL IS A CACHED ANSWER, which is the one place in this
   folder where the two are told apart. The suggest cache can use null for both because
   its value is never null; DeepcutsLibrary is null when a read failed, and caching that
   for a quarter of an hour would sit on an outage long after it ended. So a failure is
   simply not written, and the next reader tries again. */
const libraryCache = createLibraryCache();

/**
 * Walks the pages after the first.
 *
 * OFFSET RATHER THAN FOLLOWING `next`, which is the opposite of what suggestPlaylist.ts
 * does with its own paging. It has a reason: that one is handed a `next` by the playlist
 * record it already read, so following the chain costs it nothing. Here the offset is
 * arithmetic on a limit this file chose, and stripping an absolute URL back to a path to
 * arrive at the same number would be the longer way round.
 *
 * The cap is a guard against a paging bug becoming an unbounded loop, not a limit
 * anybody expects to reach. See LIBRARY_MAX_PAGES.
 *
 * DE-DUPLICATED ON THE WAY OUT, BECAUSE OFFSET PAGING OVER THIS COLLECTION REPEATS
 * ITSELF. Spotify does not promise an order for a library and pages it by offset, so an
 * item can move across a page boundary between two requests and be read twice. Measured
 * against the real account on 2026-09-05: 199 playlists in four pages of 50, and two ids
 * came back twice. Nothing failed — every request answered 200 and the totals agreed —
 * and the only symptom was React refusing two children with the same key.
 *
 * Following `next` instead of computing the offset would not have helped: Spotify builds
 * that URL out of the same offset. The fix belongs here, on the collected list.
 */
const allPlaylists = async (): Promise<Spotify.SimplePlaylistResponse[]> => {
  const found: Spotify.SimplePlaylistResponse[] = [];

  for (let page = 0; page < LIBRARY_MAX_PAGES; page += 1) {
    const body = await spotifyRead.getJson<Spotify.MyPlaylistsResponse>({
      path: spotifyEndpoints.myPlaylists({
        limit: LIBRARY_READ_LIMIT,
        offset: page * LIBRARY_READ_LIMIT,
      }),
    });

    const items = body?.items ?? [];
    found.push(...items);

    /* Stop on the last page rather than on a page count. A short page is the end of the
       library, and `next` says so explicitly — but a library whose size is an exact
       multiple of the limit ends with a full page and a null `next`, so the length test
       alone would spend one more request finding an empty one. */
    if (!body?.next || items.length < LIBRARY_READ_LIMIT) break;
  }

  return uniqueBy({ values: found, key: (playlist) => playlist.id });
};

/**
 * Whether one playlist belongs on a page anybody can open.
 *
 * THE FILTER IS OURS BECAUSE SPOTIFY HAS NONE. GET /me/playlists takes `limit` and
 * `offset` and nothing else: there is no parameter for public-only and none for
 * owned-only. So the whole library crosses the wire and these two tests decide what
 * survives it:
 *
 *   owned    A library holds followed playlists beside owned ones, and being dealt
 *            cards out of somebody else's list is a different app. Compared on
 *            `owner.id` rather than on a display name, which two accounts can share.
 *   public   Strictly `=== true`. Spotify sends null when it will not say, and null is
 *            not consent. A playlist whose visibility is unanswered is treated as
 *            private and stays off the page.
 *
 * EXPORTED SO IT CAN BE PINNED, which is the only reason it is not an inline predicate
 * in the filter below. It is four words of logic and the cost of getting it wrong is a
 * private playlist's name on a public page, so `playlist.public` in place of
 * `playlist.public === true` is a one-character edit that leaks. That belongs in a test
 * rather than in a comment asking the next reader to be careful.
 */
export const isOwnPublicPlaylist = (args: {
  playlist: Spotify.SimplePlaylistResponse;
  owner: string;
}): boolean => args.playlist.owner?.id === args.owner && args.playlist.public === true;

/**
 * Every playlist this account owns and has made public, in Spotify's own order.
 *
 * The order is Spotify's and is left alone. It is roughly the order the library is
 * arranged in, which is the order jaako sees in his own client, so a shelf that matched
 * it is the least surprising one. Sorting by track count or by name would be this page
 * asserting an opinion about a list it did not make.
 *
 * Null rather than a throw, and null rather than an "unavailable" shape: reads degrade,
 * and the page falls back to the sealed pack it has always shown. An empty array is a
 * different answer and the page says a different thing for it — see DeepcutsLibrary.
 */
const playlists = async (): Promise<DeepcutsLibrary> => {
  try {
    if (!hasCredentials()) return null;

    const cached = libraryCache.read();
    if (cached !== undefined) return cached;

    /* First, and awaited before the library rather than beside it. Without an owner id
       there is no filter, and a shelf that cannot be filtered must not be rendered
       unfiltered — that would put followed playlists, and every account they belong to,
       on the page. */
    const owner = await ownerId();
    if (!owner) return null;

    const all = await allPlaylists();

    const shelf = all
      .filter((playlist) => isOwnPublicPlaylist({ playlist, owner }))
      .map((playlist) => toDeepcutsPlaylist({ playlist }))
      /* The mapper returns null for a playlist with no id, which is the one field a row
         cannot be drawn without. Narrowed rather than cast: the predicate is what makes
         the array's type honest about what survived. */
      .filter((playlist) => playlist !== null);

    libraryCache.write(shelf);
    return shelf;
  } catch (error) {
    /* The scope is the likeliest reason to land here and it is worth naming, because a
       403 from this path is not a broken deployment: it is a token minted before
       /lab/deepcuts existed. Status only, never the body. */
    console.error("[deepcuts] playlist library failed:", error);
    return null;
  }
};

export const deepcutsLibrary = {
  playlists,
};
