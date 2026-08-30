import "server-only";
import { neon } from "@neondatabase/serverless";
import { serverConfig } from "@/server/serverConfig";

/**
 * The database handle, and the one place that knows which database it is.
 *
 * `import { sql } from "@/server/db"`. Everything else in src/server writes queries
 * against this and never reaches for the driver itself.
 *
 * WHY THE HTTP DRIVER RATHER THAN `pg`. A route handler on a serverless host is a
 * short-lived process, and there can be a great many of them at once. A pooling TCP
 * client either exhausts the database's connection limit or spends most of a request
 * establishing a connection it will immediately throw away. `neon()` turns a query
 * into one HTTPS request, so there is no pool to size, nothing to keep warm and
 * nothing to close. That is the whole argument for this being the repo's sixth
 * runtime dependency; see docs/lab.md on why there were five.
 *
 * It is also why this file has no `connect` and no `end`. There is no connection.
 */

/**
 * False on a fresh clone or a host with a forgotten variable.
 *
 * The same shape as hasCredentials() in server/spotify/auth.ts, and it exists for the
 * same reason: a caller should be able to ask before it tries, so a missing variable
 * becomes a refusal it can explain rather than an exception at the driver.
 *
 * The behaviour the two callers want is NOT the same, though, and that difference is
 * the point. A read degrades — the suggestion list renders without names. A write
 * refuses out loud — a suggestion box that silently swallows suggestions is worse
 * than one that admits it is off.
 */
export const hasDatabase = (): boolean => Boolean(serverConfig.database_url);

/**
 * Tagged-template SQL. Interpolations are sent as bound parameters, never as text:
 *
 *     const rows = await sql`select name from suggestion where track_uri = ${uri}`;
 *
 * So the ordinary way to write a query here is also the safe one. If a query ever
 * needs an identifier rather than a value — a table name, a column — that cannot be a
 * parameter and has to be a literal in the template, which is a good moment to stop
 * and ask why a query in this codebase is being built rather than written.
 *
 * Constructed lazily rather than at module load. `neon()` throws on an empty
 * connection string, and this module is imported by code paths that only want to ask
 * hasDatabase() before deciding not to use it.
 */
let client: ReturnType<typeof neon> | null = null;

/**
 * Typed as rows rather than as the driver's full union.
 *
 * neon() can return arrays, objects or a full result envelope depending on options
 * this file does not set, so its own return type is all three at once and a caller
 * cannot even ask a result for its length. With the defaults it is always an array of
 * rows, and saying so here is what keeps the cast in one place instead of at every
 * query. The generic lets a caller name the shape it selected.
 */
export const sql = <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> => {
  if (!client) client = neon(serverConfig.database_url);
  return client(strings, ...values) as Promise<T[]>;
};
