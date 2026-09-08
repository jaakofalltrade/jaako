import { Pool } from "@neondatabase/serverless";
import { loadEnvLocal } from "./loadEnv.mjs";

/**
 * Empties the pack tables, so /lab/deepcuts starts from nothing again.
 *
 *     pnpm db:wipe-packs              count the rows and change nothing
 *     pnpm db:wipe-packs --yes        actually empty them
 *
 * WHY THIS EXISTS. The pack rip writes two tables and nothing deletes from either of
 * them: a rip is a thing that happened, so the app has no reason to ever take one back.
 * That is the right call for the app and the wrong one for a laptop, where the rows are
 * a week of testing the deal - packs opened to watch an animation, cards pulled by a
 * visitor id that is one browser profile. "Most opened" and "rarest ever pulled" are
 * both a MAX over that noise, so once a test rip has pulled a GHOST the page prints it
 * forever and nobody can see what the page looks like before anybody has played.
 *
 * IT WIPES TWO TABLES AND ONLY EVER THOSE TWO. pack_card and pack_rip. The suggestion
 * app's tables live in the same database and this does not name them, so a wipe of the
 * card game cannot take the song suggestions with it. Both pack tables are named in the
 * one statement rather than leaning on the cascade, because `truncate pack_rip` alone
 * would make Postgres refuse for the foreign key - and a CASCADE that gets added to
 * silence it is a wildcard that would follow any key added later.
 *
 * RESTART IDENTITY, so the next pack opened is rip 1 rather than rip 348. A clean slate
 * with a counter still running is not the state a fresh database is in, and the ids show
 * up in logs while the deal is being worked on.
 *
 * DRY BY DEFAULT. With no flag it connects, counts, prints which database it counted and
 * exits without writing, because the whole risk here is running it against the wrong one.
 * The Neon host is printed on both paths for that reason: the pooled string for main and
 * the one for a branch differ by an endpoint id in the middle of a line of noise, and the
 * time to notice is before the truncate, not after.
 *
 * WHICH IS THE OPPOSITE WAY ROUND FROM cards:backfill, and deliberately. That script
 * writes unless it is passed --dry, because it only ever fills nulls and the worst a
 * second run can do is nothing. This one cannot be run twice by accident: what it takes
 * away does not come back, so the flag is on the side that destroys rather than the side
 * that reports.
 *
 * PER BRANCH, exactly like migrate.mjs, and the same escape hatch. An exported value wins
 * over .env.local:
 *
 *     DATABASE_URL='<branch pooled string>' pnpm db:wipe-packs --yes
 *
 * POOL RATHER THAN THE HTTP DRIVER, for the second of the two reasons migrate.mjs gives:
 * this wants a real transaction. The count and the truncate go in one, so the number it
 * reports as deleted is the number that was there when it deleted them.
 */

/** Emptied together, and named child-first the way the truncate wants them read. */
const TABLES = ["pack_card", "pack_rip"];

/**
 * Which database this is about to touch, with the password left out of it.
 *
 * A string that will not parse says so rather than being echoed. It is the password that
 * is being left out, and a malformed value is exactly the case where printing it whole
 * would put one on the terminal, and from there into the paste of a command that broke.
 */
const describe = (connectionString) => {
  try {
    const url = new URL(connectionString);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "unreadable, because DATABASE_URL is not a URL";
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

  const confirmed = process.argv.slice(2).includes("--yes");

  /* Printed before the connection is opened rather than after it. The whole risk here is
     running this against the wrong database, so which one it is about to reach should
     survive a connection that never comes up. */
  console.log(`database: ${describe(url)}`);

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  try {
    /* A Neon branch that has never been migrated has no pack tables, and truncating a
       table that does not exist is an error rather than a no-op. to_regclass answers
       null instead of throwing, which is the one way to ask Postgres this question
       without a failed statement in the middle of a transaction. */
    const { rows: present } = await client.query(
      "select table_name from unnest($1::text[]) as table_name where to_regclass(table_name) is not null",
      [TABLES]
    );

    if (present.length < TABLES.length) {
      const missing = TABLES.filter(
        (table) => !present.some((row) => row.table_name === table)
      );
      console.log(
        `no pack tables here (missing: ${missing.join(", ")}). Nothing to wipe.\n` +
          "This database has not been migrated: run pnpm db:migrate."
      );
      return;
    }

    await client.query("begin");
    try {
      const { rows } = await client.query(
        "select (select count(*) from pack_rip) as rips, (select count(*) from pack_card) as cards"
      );

      /* count() arrives as a string, because bigint does not fit a JS number and the
         driver will not silently lose the difference. Same note as the store. */
      const rips = Number(rows[0].rips);
      const cards = Number(rows[0].cards);

      if (!rips && !cards) {
        console.log("already empty. 0 rips, 0 cards.");
        await client.query("commit");
        return;
      }

      if (!confirmed) {
        console.log(
          `${rips} rip(s), ${cards} card(s) would be deleted.\n` +
            "Nothing was changed. Re-run with --yes to empty them."
        );
        await client.query("commit");
        return;
      }

      /* Written out rather than built from the list above. An identifier cannot be a
         bound parameter, so a table name in a query is always a literal in the template,
         and the rule this repo writes on that (see sql in src/server/db/index.ts) is that
         a query being CONSTRUCTED is the moment to stop. The list is what the existence
         check reads; this statement says plainly what it empties. */
      await client.query("truncate table pack_card, pack_rip restart identity");
      await client.query("commit");

      console.log(`wiped ${rips} rip(s) and ${cards} card(s). Ids restart at 1.`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  } finally {
    client.release();
    // Without this the WebSocket keeps the process alive and the script never exits.
    await pool.end();
  }
};

run().catch((error) => {
  console.error("wipe failed:", error.message);
  process.exit(1);
});
