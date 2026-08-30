import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";
import { loadEnvLocal } from "./loadEnv.mjs";

/**
 * Applies every migration in src/server/db/migrations that has not run yet.
 *
 *     pnpm db:migrate
 *
 * A script rather than a migration framework, and that is the same trade the rest of
 * this repo makes: there is one table of applied filenames, files are applied in
 * filename order, and each one runs once. What a framework would add on top of that is
 * rollbacks and generated diffs, neither of which is worth a dependency for a schema
 * this size.
 *
 * SAFE TO RUN REPEATEDLY, twice over. The ledger skips a file that has already run,
 * and every statement in the migrations is written `if not exists` as well.
 *
 * PER BRANCH. The ledger lives inside the database it describes, so a Neon branch that
 * has never been migrated has no tables however many times this has run elsewhere.
 * Point it at another branch by exporting the variable, which wins over .env.local:
 *
 *     DATABASE_URL='<main pooled string>' pnpm db:migrate
 *
 * POOL RATHER THAN THE HTTP DRIVER, WHICH IS THE OPPOSITE OF src/server/db/index.ts.
 *
 * That file uses neon() over HTTP because a route handler is short-lived and there is
 * no connection to keep. This is neither: it is a one-off CLI, and it needs two things
 * the HTTP driver cannot give it.
 *
 *   1. MULTIPLE STATEMENTS IN ONE QUERY. neon() sends a prepared statement, and
 *      Postgres refuses more than one command in one of those: "cannot insert multiple
 *      commands into a prepared statement", error 42601. Every migration here is
 *      several statements, so every migration failed. Splitting the file on semicolons
 *      would be the other fix and a worse one, because doing that correctly means
 *      parsing SQL rather than searching it.
 *
 *   2. A REAL TRANSACTION. A migration that fails halfway should leave nothing behind,
 *      and the ledger row should land only if the SQL did. Wrapping both in one BEGIN
 *      is what makes "applied" mean what it says.
 *
 * Pool speaks the Postgres wire protocol over a WebSocket, which is exactly the thing
 * that would be wrong in a serverless request handler and is fine in a script that
 * runs once and exits.
 */

const here = dirname(fileURLToPath(import.meta.url));
const migrations = join(here, "..", "src", "server", "db", "migrations");

const run = async () => {
  loadEnvLocal();

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL is not set. Put it in .env.local, or export it before running this.\n" +
        "See docs/neon-setup.md."
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  try {
    // The ledger. Created by this script rather than by a migration, because a
    // migration that creates the table recording which migrations have run is a
    // chicken and egg nobody enjoys reading.
    await client.query(`
      create table if not exists schema_migration (
        filename    text          primary key,
        applied_at  timestamptz   not null default now()
      )
    `);

    const { rows } = await client.query("select filename from schema_migration");
    const applied = new Set(rows.map((row) => row.filename));

    // Filename order, which is why they are numbered. 001, 002, 010: zero-padded so
    // the tenth migration does not sort before the second.
    const files = readdirSync(migrations)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    const pending = files.filter((file) => !applied.has(file));

    if (!pending.length) {
      console.log(
        `nothing to apply. ${files.length} migration(s) already on this database.`
      );
      return;
    }

    for (const file of pending) {
      const contents = readFileSync(join(migrations, file), "utf8");
      console.log(`applying ${file}`);

      // One transaction per file. The SQL and its ledger row land together or not at
      // all, so a failure halfway through leaves the database exactly as it was and
      // the file still counts as pending on the next run.
      await client.query("begin");
      try {
        await client.query(contents);
        await client.query("insert into schema_migration (filename) values ($1)", [file]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw new Error(`${file}: ${error.message}`, { cause: error });
      }
    }

    console.log(`applied ${pending.length} migration(s).`);
  } finally {
    client.release();
    // Without this the WebSocket keeps the process alive and the script never exits.
    await pool.end();
  }
};

run().catch((error) => {
  console.error("migration failed:", error.message);
  process.exit(1);
});
