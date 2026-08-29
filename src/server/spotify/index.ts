import "server-only";

/**
 * `import { spotifyService } from "@/server/spotify"`.
 *
 * The only name this folder means to be imported by. auth and mappers are reachable
 * but are not the interface: a route wants the two reads, and everything else in here
 * exists to serve them. Spotify's upstream paths are not in this folder at all —
 * they sit at src/server/endpoints.ts, beside the config, for the reason its own
 * header gives.
 */

export { spotifyService } from "./spotifyService";
