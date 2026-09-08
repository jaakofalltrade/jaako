import "server-only";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { serverConfig } from "@/server/serverConfig";

/**
 * The database handle, and the one place that knows which database it is.
 *
 * `import { sql } from "@/server/db"`. Everything else in src/server writes queries
 * against this and never reaches for a driver itself.
 *
 * TWO DRIVERS, AND ONE RULE PICKS BETWEEN THEM.
 *
 *     DATABASE_URL set    ->  Neon, over HTTP. Production, and an rc branch.
 *     DATABASE_URL unset  ->  Postgres in .pgdata/ on this machine. Local.
 *
 * That rule IS the local/production split, and the reason it is written this way round
 * is that it cannot be got wrong by accident. There is no connection string to read
 * carefully, no endpoint id to compare against a branch name, and no way to be pointed
 * at production without having deliberately typed a connection string. The old split -
 * one variable holding either a dev branch or the real one, told apart by an endpoint id
 * in the middle of a line of noise - was a naming convention pretending to be a boundary.
 *
 * WHY THE HTTP DRIVER FOR NEON RATHER THAN `pg`. A route handler on a serverless host is
 * a short-lived process, and there can be a great many of them at once. A pooling TCP
 * client either exhausts the database's connection limit or spends most of a request
 * establishing a connection it will immediately throw away. `neon()` turns a query into
 * one HTTPS request, so there is no pool to size, nothing to keep warm and nothing to
 * close. That is why this file has no `connect` and no `end` on the cloud path.
 *
 * WHY PGLITE FOR LOCAL RATHER THAN A CONTAINER. PGlite is Postgres compiled to
 * WebAssembly, running in this process. scripts/db-verify.mjs already trusts it with a
 * heavier job than this one - its verdict is what stands between a bad migration and
 * real rows - so the engine was already in the repo and already believed. What it buys
 * over Docker is that `pnpm dev` needs no daemon, no container, no port and no
 * connection string, and what it costs is that the local engine is not bit-identical to
 * Neon. For a schema of text, uuid, check constraints and `on conflict` that gap is
 * narrow, and db:verify keeps running every migration against it either way.
 *
 * IT IS A DEV DEPENDENCY, so `NODE_ENV === "production"` is a hard gate on the import
 * below rather than a preference: a production build is exactly the case where the
 * package may not be installed, and taking that branch there should be impossible rather
 * than unlikely.
 */

/** Where the local Postgres lives. Gitignored, disposable, and safe to delete. */
const LOCAL_DATA_DIRECTORY = join(process.cwd(), ".pgdata");

/**
 * True when this process may fall back to the local database.
 *
 * NODE_ENV rather than serverConfig.env, and that is the point. `Env` resolves anything
 * unset or unrecognised to Local, so a production host with a forgotten ENV would look
 * local to a check written against it - and would then try to import a package that is
 * not installed instead of degrading. `next build` and `next start` set NODE_ENV to
 * production and `next dev` does not, which is the same line as "are devDependencies
 * guaranteed to be here".
 */
const canUseLocalDatabase = process.env.NODE_ENV !== "production";

/** Rows, which is what both drivers hand back once the envelope is off. */
type Rows<T> = T[];

/**
 * A driver is a tagged template that has already decided where it is sending the query.
 *
 * The template pieces are passed through rather than joined into a string, because the
 * whole safety property of this module is that interpolations become bound parameters
 * and never text. Each driver binds them its own way and neither is given the chance to
 * concatenate.
 */
type Driver = <T>(
  strings: TemplateStringsArray,
  values: unknown[]
) => Promise<Rows<T>>;

/**
 * False on a production host with a forgotten variable.
 *
 * The same shape as hasCredentials() in server/spotify/spotifyAccessTokens.ts, and it
 * exists for the same reason: a caller should be able to ask before it tries, so a
 * missing variable becomes a refusal it can explain rather than an exception at the
 * driver.
 *
 * The behaviour the two callers want is NOT the same, and that difference is the point.
 * A read degrades - the suggestion list renders without names. A write refuses out loud
 * - a suggestion box that silently swallows suggestions is worse than one that admits it
 * is off.
 *
 * LOCALLY THIS IS NOW ALWAYS TRUE, which is the change worth noticing. A fresh clone used
 * to have no database at all until somebody pasted a connection string into .env.local,
 * so every lab page came up in its degraded state and the degraded state was the only one
 * most clones ever showed. `pnpm db:migrate` is now the whole of that setup and it needs
 * no credential.
 */
export const hasDatabase = (): boolean =>
  Boolean(serverConfig.database_url) || canUseLocalDatabase;

/**
 * Turns the template pieces into `select ... where x = $1`, which is the only shape
 * PGlite takes parameters in.
 *
 * n pieces of text always fence n-1 values, so the placeholder is emitted for every
 * piece except the last. Nothing about a value reaches the string.
 */
const parameterise = (strings: TemplateStringsArray): string =>
  strings.reduce(
    (text, piece, index) =>
      text + piece + (index < strings.length - 1 ? `$${index + 1}` : ""),
    ""
  );

const createNeonDriver = (): Driver => {
  const client = neon(serverConfig.database_url);
  return <T>(strings: TemplateStringsArray, values: unknown[]) =>
    client(strings, ...values) as Promise<Rows<T>>;
};

const createLocalDriver = async (): Promise<Driver> => {
  // Dynamic, so the package name never appears in a static import a production build
  // would have to resolve. next.config.ts also lists it in serverExternalPackages, which
  // keeps Turbopack from trying to bundle a WebAssembly payload it cannot inline.
  const { PGlite } = await import("@electric-sql/pglite");
  const database = new PGlite(LOCAL_DATA_DIRECTORY);
  await database.waitReady;

  return async <T>(strings: TemplateStringsArray, values: unknown[]) => {
    const { rows } = await database.query(parameterise(strings), [...values]);
    return rows as Rows<T>;
  };
};

/**
 * Memoised as a PROMISE rather than as a driver, which matters more than it looks.
 *
 * Opening the local database is asynchronous, and a cold server answers several requests
 * at once. Storing the resolved value would let every one of those start its own PGlite
 * on the same directory, and PGlite holds a single exclusive connection to it. Storing
 * the promise means the second caller waits on the first one's open.
 */
let driver: Promise<Driver> | null = null;

const getDriver = (): Promise<Driver> => {
  if (!driver) {
    driver = serverConfig.database_url
      ? Promise.resolve(createNeonDriver())
      : createLocalDriver();
  }
  return driver;
};

/**
 * Tagged-template SQL. Interpolations are sent as bound parameters, never as text:
 *
 *     const rows = await sql`select name from suggestion where track_uri = ${uri}`;
 *
 * So the ordinary way to write a query here is also the safe one. If a query ever needs
 * an identifier rather than a value - a table name, a column - that cannot be a parameter
 * and has to be a literal in the template, which is a good moment to stop and ask why a
 * query in this codebase is being built rather than written.
 *
 * Typed as rows rather than as a driver's full union. neon() can return arrays, objects
 * or a result envelope depending on options this file does not set, so its own return
 * type is all three at once and a caller cannot even ask a result for its length. With
 * the defaults it is always an array of rows, and saying so here is what keeps the cast
 * in one place instead of at every query. The generic lets a caller name the shape it
 * selected.
 */
export const sql = async <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> => {
  const run = await getDriver();
  return run<T>(strings, values);
};
