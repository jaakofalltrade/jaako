import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase, resolveDatabase } from "./dbClient.mjs";
import { hasLocalCluster } from "./pgdataLock.mjs";

/**
 * Says which database you are on and what is in it.
 *
 *     pnpm db:which
 *
 * WHY THIS EXISTS. Nothing else in the repo can answer "where am I pointed". The app
 * decides silently, the migrate script only says so on its way to changing something, and
 * a connection string does not carry a branch name - two Neon branches of the same
 * project differ by an endpoint id in the middle of a line of noise. That was survivable
 * while there was one kind of database and is not now that there are two, because the
 * whole local/production split rests on a variable being unset and an unset variable is
 * invisible until you look for it.
 *
 * IT ONLY EVER READS, which is what makes it the one db script safe to run when you are
 * not sure what you are about to do. No transaction, no writes, and the ledger table is
 * probed rather than assumed so a never-migrated database is an answer rather than a
 * stack trace.
 *
 * WHICH INCLUDES NOT CREATING THE THING IT REPORTS ON. Opening a local directory that is
 * not there is not a read: PGlite runs initdb and leaves a whole cluster behind, so the
 * script that promised to only look would answer "never migrated" and then make that
 * false. On a fresh clone the honest answer needs no database open at all, so it does not
 * open one.
 */

const here = dirname(fileURLToPath(import.meta.url));
const migrations = join(here, "..", "src", "server", "db", "migrations");

/** Every table a migration creates, in the order a reader thinks about them. */
const TABLES = ["suggestion", "visitor", "pack_rip", "pack_card"];

const run = async () => {
  const destination = resolveDatabase();
  console.log(`database: ${destination.description}`);
  console.log(
    destination.isRemote
      ? "          DATABASE_URL is set, so this is a deployment.\n"
      : "          no DATABASE_URL, so nothing outside this folder can be reached.\n"
  );

  const onDisk = readdirSync(migrations)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (!destination.isRemote && !hasLocalCluster()) {
    console.log(`migrations: 0 of ${onDisk.length} applied.`);
    console.log("            There is no local database yet. Run pnpm db:migrate.");
    return;
  }

  const database = await openDatabase(destination, { as: "pnpm db:which" });

  try {
    /* to_regclass answers null instead of throwing, which is the one way to ask Postgres
       whether a table exists without a failed statement to recover from. */
    const { rows: ledgerRows } = await database.query(
      "select to_regclass('schema_migration') is not null as present"
    );

    if (!ledgerRows[0].present) {
      console.log(`migrations: 0 of ${onDisk.length} applied.`);
      console.log("            This database has never been migrated. Run pnpm db:migrate.");
      return;
    }

    const { rows: applied } = await database.query(
      "select filename, applied_at from schema_migration order by filename"
    );
    const appliedNames = new Set(applied.map((row) => row.filename));
    const pending = onDisk.filter((file) => !appliedNames.has(file));

    console.log(`migrations: ${applied.length} of ${onDisk.length} applied.`);
    for (const row of applied) {
      console.log(`            ${row.filename}  ${new Date(row.applied_at).toISOString()}`);
    }
    for (const file of pending) {
      console.log(`            ${file}  PENDING`);
    }
    if (pending.length) console.log("            Run pnpm db:migrate.");

    console.log("");

    /* Counted one table at a time rather than in a single select, so a schema that is
       half-migrated reports the tables it does have instead of failing on the first one
       it does not. */
    const present = [];
    for (const table of TABLES) {
      const { rows } = await database.query(
        "select to_regclass($1) is not null as present",
        [table]
      );
      if (rows[0].present) present.push(table);
    }

    if (!present.length) {
      console.log("rows:       no application tables yet.");
      return;
    }

    console.log("rows:");
    for (const table of present) {
      // An identifier cannot be a bound parameter, so a table name in a query is always a
      // literal in the template. These come from the constant above and never from input.
      const { rows } = await database.query(`select count(*) as n from ${table}`);
      // count() arrives as a string, because bigint does not fit a JS number and the
      // driver will not silently lose the difference. Same note as the store.
      console.log(`            ${table.padEnd(12)} ${Number(rows[0].n)}`);
    }
  } finally {
    await database.close();
  }
};

run().catch((error) => {
  console.error("could not read the database:", error.message);
  process.exit(1);
});
