import "server-only";

/**
 * `import { spotifyService } from "@/server/spotify"`.
 *
 * Two names now: spotifyService for the homepage panel, playlistService for the lab
 * playlist behind /lab/suggest. They are separate because they answer to different
 * pages and are allowed to fail independently.
 *
 * The names this folder means to be imported by. auth and mappers are reachable
 * but are not the interface: a route wants the two reads, and everything else in here
 * exists to serve them. Spotify's upstream paths are not in this folder at all —
 * they sit at src/server/endpoints.ts, beside the config, for the reason its own
 * header gives.
 */

export { spotifyService } from "./spotifyService";
export { playlistService } from "./playlist";
