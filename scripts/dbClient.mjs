import { Pool } from "@neondatabase/serverless";
import { loadEnvLocal } from "./loadEnv.mjs";
import {
  LOCAL_DATA_DIRECTORY,
  claimLocalDataDirectory,
  hasLocalCluster,
  releaseLocalDataDirectory,
} from "./pgdataLock.mjs";

/**
 * Opens whichever database this command is meant to be talking to, and says which.
 *
 * THE SAME ONE RULE src/server/db/index.ts USES, and it has to be the same one or the
 * app and the scripts that maintain it would disagree about what "local" means:
 *
 *     DATABASE_URL set    ->  Neon, over a WebSocket. Production, and an rc branch.
 *     DATABASE_URL unset  ->  Postgres in .pgdata/ on this machine. Local.
 *
 * WHICH IS ALSO THE GUARD. Under the old arrangement every database was a connection
 * string and the only thing separating the laptop from production was which one had been
 * pasted into .env.local. There was nothing for a script to check. Now the presence of
 * the variable is itself the signal: no DATABASE_URL means nothing outside this folder
 * can be reached, and a DATABASE_URL means whatever is about to happen is happening to a
 * real deployment. `isRemote` below is what the destructive scripts gate on.
 *
 * POOL RATHER THAN THE HTTP DRIVER on the cloud path, which is the opposite of
 * src/server/db/index.ts. That file uses neon() over HTTP because a route handler is
 * short-lived and there is no connection to keep. These are neither: they are one-off
 * CLIs, and they need two things the HTTP driver cannot give them.
 *
 *   1. MULTIPLE STATEMENTS IN ONE QUERY. neon() sends a prepared statement, and Postgres
 *      refuses more than one command in one of those: "cannot insert multiple commands
 *      into a prepared statement", error 42601. Every migration here is several
 *      statements. Splitting the file on semicolons would be the other fix and a worse
 *      one, because doing that correctly means parsing SQL rather than searching it.
 *
 *   2. A REAL TRANSACTION. A migration that fails halfway should leave nothing behind,
 *      and the ledger row should land only if the SQL did.
 *
 * Pool speaks the Postgres wire protocol over a WebSocket, which is exactly the thing
 * that would be wrong in a serverless request handler and is fine in a script that runs
 * once and exits. PGlite gives both for free, being a whole Postgres in the process.
 *
 * THE TWO ARE PRESENTED THROUGH THE SAME FOUR METHODS and no more, because a wrapper
 * that grows a fifth is on its way to being a driver of its own. query, exec, close, and
 * a description to print before any of them run.
 */

/**
 * Which database this is about to touch, with the password left out of it.
 *
 * A string that will not parse says so rather than being echoed. It is the password that
 * is being left out, and a malformed value is exactly the case where printing it whole
 * would put one on the terminal, and from there into the paste of a command that broke.
 */
const describeRemote = (connectionString) => {
  try {
    const url = new URL(connectionString);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "unreadable, because DATABASE_URL is not a URL";
  }
};

/**
 * Reads .env.local and answers where this command is pointed, without opening anything.
 *
 * Separate from openDatabase so a script can print the destination, and refuse it, before
 * a connection is attempted. Which one it is about to reach should survive a connection
 * that never comes up.
 */
export const resolveDatabase = () => {
  loadEnvLocal();

  const url = process.env.DATABASE_URL;

  return url
    ? { isRemote: true, url, description: `remote: ${describeRemote(url)}` }
    : { isRemote: false, url: null, description: `local: ${LOCAL_DATA_DIRECTORY}` };
};

const openRemote = async (url) => {
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  return {
    query: (text, values = []) => client.query(text, values),
    exec: (text) => client.query(text),
    close: async () => {
      client.release();
      // Without this the WebSocket keeps the process alive and the script never exits.
      await pool.end();
    },
  };
};

const openLocal = async (as, create) => {
  /* ONLY db:migrate MAY CREATE IT. PGlite runs initdb on a directory that is not there,
     so every other script would quietly conjure an empty cluster and then report on it -
     wipe-packs announcing "no pack tables here", backfill dying on `relation "pack_card"
     does not exist` - and leave the app believing a database exists. src/server/db makes
     the same refusal for the same reason; see the note on createLocalDriver. */
  if (!create && !hasLocalCluster()) {
    throw new Error(
      `There is no local database at ${LOCAL_DATA_DIRECTORY} yet. Run pnpm db:migrate.`
    );
  }

  // Before PGlite is asked for the directory, because PGlite will not refuse it. If the
  // dev server holds it, this is where the script stops - loudly, and with the pid.
  claimLocalDataDirectory({ as });

  const { PGlite } = await import("@electric-sql/pglite");
  const database = new PGlite(LOCAL_DATA_DIRECTORY);
  await database.waitReady;

  return {
    query: (text, values = []) => database.query(text, values),
    // exec rather than query, because PGlite draws the line the HTTP driver draws: query
    // is one statement with parameters, exec is a script of them with none.
    exec: (text) => database.exec(text),
    close: async () => {
      await database.close();
      // Given up here rather than only at exit, so the dev server can be restarted the
      // moment the script is done rather than whenever this process happens to end.
      releaseLocalDataDirectory();
    },
  };
};

/**
 * The handle. Await it, use it, close it in a finally.
 *
 * Pass the resolved destination in rather than resolving again, so the thing a script
 * printed and the thing it opened cannot drift apart between the two calls.
 *
 * The `as` argument names this command in the error another process gets if it tries to
 * open the local database while this one holds it, so pass what a reader would
 * recognise: "pnpm db:migrate".
 *
 * `create` is db:migrate's alone. Everything else refuses a local database that is not
 * there rather than making an empty one, because a script that creates what it was asked
 * to look at leaves the app worse than it found it.
 */
export const openDatabase = (destination, args) =>
  destination.isRemote
    ? openRemote(destination.url)
    : openLocal(args?.as ?? "another script", args?.create ?? false);
