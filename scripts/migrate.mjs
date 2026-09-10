import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase, resolveDatabase } from "./dbClient.mjs";

/**
 * Applies every migration in src/server/db/migrations that has not run yet.
 *
 *     pnpm db:migrate                                  the local database in .pgdata/
 *     DATABASE_URL='<string>' pnpm db:migrate --yes    a Neon branch
 *
 * A script rather than a migration framework, and that is the same trade the rest of this
 * repo makes: there is one table of applied filenames, files are applied in filename
 * order, and each one runs once. What a framework would add on top of that is rollbacks
 * and generated diffs, neither of which is worth a dependency for a schema this size.
 *
 * SAFE TO RUN REPEATEDLY, twice over. The ledger skips a file that has already run, and
 * every statement in the migrations is written `if not exists` as well.
 *
 * WITH NO DATABASE_URL THIS IS A LOCAL, DISPOSABLE OPERATION and asks nothing. It creates
 * .pgdata/ if it is not there, so `pnpm install && pnpm db:migrate && pnpm dev` is the
 * whole of setting this repo up and none of it needs a credential.
 *
 * WITH A DATABASE_URL IT REFUSES WITHOUT --yes, which is the guard this script spent six
 * migrations without. It used to read one variable and apply, and docs/neon-setup.md
 * taught you to export a production string to reach production - so a stale export in a
 * shell was all it took to reshape real rows while believing you were on a laptop. The
 * variable now means something it did not mean before: nothing local sets it, so its
 * presence is the signal that this is a deployment. Requiring the flag turns the two
 * moments a release actually migrates - the rc branch, then main at the tag - into things
 * you typed on purpose.
 *
 * PER BRANCH, STILL. The ledger lives inside the database it describes. A Neon branch cut
 * from an already-migrated parent inherits both the tables and the ledger rows, so it is
 * not bare; what is true is that the ledgers are independent from the moment of the cut,
 * and a migration added afterwards has to be applied to each branch separately.
 */

const here = dirname(fileURLToPath(import.meta.url));
const migrations = join(here, "..", "src", "server", "db", "migrations");

const run = async () => {
  const destination = resolveDatabase();
  const confirmed = process.argv.slice(2).includes("--yes");

  /* Printed before the connection is opened rather than after it. The whole risk here is
     running this against the wrong database, so which one it is about to reach should
     survive a connection that never comes up. */
  console.log(`database: ${destination.description}`);

  if (destination.isRemote && !confirmed) {
    console.error(
      "\nrefusing: DATABASE_URL is set, so this is a deployment rather than your laptop.\n" +
        "Migrations cannot be rolled back. Re-run with --yes if that is what you meant,\n" +
        "or unset DATABASE_URL to migrate the local database in .pgdata/.\n" +
        "See docs/neon-setup.md."
    );
    process.exit(1);
  }

  const database = await openDatabase(destination, { as: "pnpm db:migrate" });

  try {
    // The ledger. Created by this script rather than by a migration, because a migration
    // that creates the table recording which migrations have run is a chicken and egg
    // nobody enjoys reading.
    await database.exec(`
      create table if not exists schema_migration (
        filename    text          primary key,
        applied_at  timestamptz   not null default now()
      )
    `);

    const { rows } = await database.query("select filename from schema_migration");
    const applied = new Set(rows.map((row) => row.filename));

    // Filename order, which is why they are numbered. 001, 002, 010: zero-padded so the
    // tenth migration does not sort before the second.
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

      // One transaction per file. The SQL and its ledger row land together or not at all,
      // so a failure halfway through leaves the database exactly as it was and the file
      // still counts as pending on the next run.
      await database.query("begin");
      try {
        await database.exec(contents);
        await database.query(
          "insert into schema_migration (filename) values ($1)",
          [file]
        );
        await database.query("commit");
      } catch (error) {
        await database.query("rollback");
        throw new Error(`${file}: ${error.message}`, { cause: error });
      }
    }

    console.log(`applied ${pending.length} migration(s).`);
  } finally {
    await database.close();
  }
};

run().catch((error) => {
  console.error("migration failed:", error.message);
  process.exit(1);
});
