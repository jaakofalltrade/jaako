import "server-only";
import { neon } from "@neondatabase/serverless";
import {
  LOCAL_DATA_DIRECTORY,
  claimLocalDataDirectory,
  hasLocalCluster,
} from "@/server/db/localDataDirectory";
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
 * WHAT IT ALSO COSTS is that a container would have given us mutual exclusion for free
 * and PGlite gives us none: it does not lock its data directory, and two processes in one
 * directory silently lose one side's writes. localDataDirectory.ts is the lock that buys
 * that back, and it is the reason `pnpm db:migrate` asks you to stop the dev server
 * rather than quietly doing nothing.
 *
 * IT IS A DEV DEPENDENCY, so `NODE_ENV === "production"` is a hard gate on the import
 * below rather than a preference: a production build is exactly the case where the
 * package may not be installed, and taking that branch there should be impossible rather
 * than unlikely.
 */

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
 * LOCALLY IT ASKS THE DISK, and it has to. A fresh clone used to have no database at all
 * until somebody pasted a connection string into .env.local, so every lab page came up
 * degraded. `pnpm db:migrate` is now the whole of that setup and needs no credential -
 * but between the clone and that command there is a window this function has to be honest
 * about. PGlite creates an empty cluster on first open, so "a database is reachable" and
 * "a database has our tables" are different facts, and answering the first when a caller
 * meant the second is what turns a clean 503 into `relation "visitor" does not exist` and
 * a 500. hasLocalCluster() is the second fact.
 *
 * The check is a stat per call in development and none in production, where the first
 * operand short-circuits. Nothing opens the database to answer it, which is what keeps
 * the answer from creating the thing it was asked about.
 */
export const hasDatabase = (): boolean =>
  Boolean(serverConfig.database_url) || (canUseLocalDatabase && hasLocalCluster());

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
  /**
   * THE APP NEVER RUNS initdb. `pnpm db:migrate` is the only thing allowed to bring a
   * local database into being, and this refusal is what makes that true.
   *
   * Opening a directory that is not there is not a read: PGlite creates a whole cluster,
   * and one created here would be empty. That is worse than no database at all, because
   * hasDatabase() above answers on PG_VERSION - so the first query to slip past it would
   * conjure the file that makes it answer "yes" forever, and every write after that would
   * hit `relation "visitor" does not exist` and a 500 instead of the honest 503 the whole
   * check exists to produce. A read that has no guard of its own - namesByUri is the one -
   * is exactly how that gets reached on a fresh clone.
   *
   * So the app degrades on a missing database rather than papering over it, which is what
   * it already did when the only database was a connection string somebody had not pasted
   * in yet.
   */
  if (!hasLocalCluster()) {
    throw new Error(
      `There is no local database at ${LOCAL_DATA_DIRECTORY} yet. Run pnpm db:migrate.`
    );
  }

  // Before the directory is opened. PGlite will not stop a second process from opening
  // this same directory and silently eating one side's writes, so the refusal has to
  // happen here. See localDataDirectory.ts.
  claimLocalDataDirectory({ as: "the dev server" });

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
 * on the same directory, which nothing below this module would stop. Storing the promise
 * means the second caller waits on the first one's open.
 *
 * A FAILED OPEN IS NOT KEPT. Only a fulfilled promise is worth memoising: a rejection
 * cached here would outlive whatever caused it, so a data directory that was briefly held
 * by a script, or an unwritable folder fixed a second later, would keep answering with
 * the same stale error until the server was restarted. Clearing it costs one extra open
 * attempt and buys a dev server that recovers on the next request.
 *
 * ON globalThis RATHER THAN IN THIS MODULE, which is the part that actually keeps the
 * local database intact. Module state is per module INSTANCE, and one `next dev` process
 * holds several instances of this graph - the RSC layer and the route-handler layer are
 * compiled separately, and an edit re-evaluates the chain. A module-scoped memo would
 * therefore let one process open PGlite two or three times over on the same directory,
 * and two PGlite instances on one directory diverge exactly as two processes do: measured,
 * the first never sees the second's committed row and the last writer's view is what
 * lands. The .pgdata lock cannot catch it, because every one of those opens has the same
 * pid. One memo per process is what makes one instance per process.
 */
const driverState = globalThis as typeof globalThis & {
  __jaakoDbDriver?: Promise<Driver> | null;
};

const getDriver = (): Promise<Driver> => {
  const driver = driverState.__jaakoDbDriver;
  if (driver) return driver;

  if (serverConfig.database_url) {
    driverState.__jaakoDbDriver = Promise.resolve(createNeonDriver());
    return driverState.__jaakoDbDriver;
  }

  /**
   * The gate the module header promises, and until now did not have.
   *
   * PGlite is a devDependency, so on a production host with a forgotten DATABASE_URL the
   * local branch does not degrade - it dynamic-imports a package that is not installed
   * and fails with MODULE_NOT_FOUND, or boots a 24MB WebAssembly Postgres nobody asked
   * for. Callers that ask hasDatabase() first never arrive here; this is for the ones
   * that do not, and it refuses in the language of the actual problem.
   *
   * Not memoised, because it is not a driver and there is nothing to reuse. The condition
   * is permanent anyway: whoever fixes it is restarting the process.
   */
  if (!canUseLocalDatabase) {
    return Promise.reject(
      new Error(
        "DATABASE_URL is unset and this is a production build, where the local " +
          "database is not available. Set DATABASE_URL to a Neon connection string."
      )
    );
  }

  const opening = createLocalDriver().catch((cause: unknown) => {
    if (driverState.__jaakoDbDriver === opening) driverState.__jaakoDbDriver = null;
    throw cause;
  });

  driverState.__jaakoDbDriver = opening;
  return opening;
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
