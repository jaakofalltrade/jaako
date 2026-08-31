import "server-only";
import { listeningActivity } from "./listeningActivity";
import { suggestPlaylist } from "./suggestPlaylist";

/**
 * `import { spotifyService } from "@/server/spotify"`.
 *
 * ONE NAMESPACE, TWO MODULES. Everything this site does with Spotify is reachable from
 * here, which is what a reader looking for "the Spotify service" expects to find, and
 * what the two separate exports this replaced did not give them.
 *
 * Grouping the exports is not joining the modules. listeningActivity and
 * suggestPlaylist are still separate files with separate caches, and they still fail
 * independently: the homepage panel degrades to an offline shape, the lab playlist
 * returns null and the page renders without a header. That difference is the reason
 * they were split in the first place and none of it is affected by sitting under one
 * name.
 *
 * The names this folder means to be imported by. spotifyAccessTokens, spotifyApiClient
 * and mappers are reachable but are not the interface: a route wants the reads, and
 * everything else in here exists to serve them. Spotify's upstream paths are not in
 * this folder at all - they sit at src/server/endpoints.ts, beside the config, for the
 * reason its own header gives.
 */
export const spotifyService = {
  /** The homepage: what is playing, and the listening statistics strip. */
  listening: listeningActivity,
  /** /lab/suggest: reading the playlist, searching, and adding to it. */
  playlist: suggestPlaylist,
};
