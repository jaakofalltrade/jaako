import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

/**
 * Applies every migration in src/server/db/migrations that has not run yet.
 *
 *     pnpm db:migrate
 *
 * A script rather than a migration framework, and that is the same trade the rest of
 * this repo makes: there is one table of applied filenames, files are applied in
 * filename order, and each one runs once. What a framework would add on top of that
 * is rollbacks and generated diffs, neither of which is worth a dependency for a
 * schema this size.
 *
 * SAFE TO RUN REPEATEDLY. Every statement in the migrations is written `if not
 * exists` as well, so the ledger and the SQL agree even if the two ever disagree.
 */

const here = dirname(fileURLToPath(import.meta.url));
const migrations = join(here, "..", "src", "server", "db", "migrations");

/**
 * Reads .env.local the way `next dev` would.
 *
 * Deliberately not a dependency and deliberately not `--env-file`: this script has to
 * run in two places, a laptop where the variables are in a file and a host where they
 * are already in the environment. Anything already set wins, so running it against a
 * production connection string is a matter of exporting one variable.
 */
const loadEnvLocal = () => {
  let contents;
  try {
    contents = readFileSync(join(here, "..", ".env.local"), "utf8");
  } catch {
    return; // No file. The host supplies the environment instead.
  }

  for (const line of contents.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    // Strip one layer of matching quotes, which is all .env files ever carry.
    process.env[key] = rawValue.trim().replace(/^(['"])(.*)\1$/, "$2");
  }
};

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

  const sql = neon(url);

  // The ledger. Created by this script rather than by a migration, because a
  // migration that creates the table recording which migrations have run is a
  // chicken and egg nobody enjoys reading.
  await sql`
    create table if not exists schema_migration (
      filename    text          primary key,
      applied_at  timestamptz   not null default now()
    )
  `;

  const applied = new Set(
    (await sql`select filename from schema_migration`).map((row) => row.filename)
  );

  // Filename order, which is why they are numbered. 001, 002, 010: zero-padded so
  // the tenth migration does not sort before the second.
  const files = readdirSync(migrations)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const pending = files.filter((file) => !applied.has(file));

  if (!pending.length) {
    console.log(`nothing to apply. ${files.length} migration(s) already on this database.`);
    return;
  }

  for (const file of pending) {
    const contents = readFileSync(join(migrations, file), "utf8");
    console.log(`applying ${file}`);

    // One HTTP round trip per file, not per statement. The driver sends the whole
    // script, so a file either lands or it does not.
    await sql.query(contents);
    await sql`insert into schema_migration (filename) values (${file})`;
  }

  console.log(`applied ${pending.length} migration(s).`);
};

run().catch((error) => {
  console.error("migration failed:", error);
  process.exit(1);
});
