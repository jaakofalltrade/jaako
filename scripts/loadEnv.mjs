import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Reads the env files into process.env, the way `next dev` does for the app.
 *
 * A standalone node script gets none of that: Next loads the env files, and nothing
 * loads them for scripts/. So every script here that needs a credential was one
 * `export` away from failing with "missing credentials" while the value sat in a file
 * three lines from the command being typed.
 *
 * BOTH FILES, IN NEXT'S ORDER, and that stopped being cosmetic when DATABASE_URL became
 * the local/production switch. Next resolves process.env, then .env.local, then .env,
 * and .env is committed. A DATABASE_URL that reached only one of the two readers would
 * split the repo in half: the app would talk to Neon while every db script silently
 * worked on .pgdata/, and db:migrate would not even ask for --yes before touching a
 * deployment. The presence of the variable is the guard now, so both halves have to be
 * looking in the same places for it.
 *
 * Shared rather than copied, because migrate.mjs and spotify-token.mjs both need it
 * and a second copy is how the two would eventually disagree about quoting.
 *
 * Deliberately not a dependency, and deliberately not `--env-file`: these scripts run
 * in two places, a laptop where the values are in a file and a host where they are
 * already in the environment. Anything already set wins, so pointing one at production
 * stays a matter of exporting a single variable.
 */

const KEY_VALUE = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/;
const WRAPPING_QUOTES = /^(['"])(.*)\1$/;

/** Nearest first, so the earlier file wins the way it does for Next. */
const FILES = [".env.local", ".env"];

export const loadEnvLocal = () => {
  const here = dirname(fileURLToPath(import.meta.url));

  for (const file of FILES) {
    let contents;
    try {
      contents = readFileSync(join(here, "..", file), "utf8");
    } catch {
      continue; // No file. The next one, or the host, supplies the environment instead.
    }

    for (const line of contents.split("\n")) {
      const match = line.match(KEY_VALUE);
      if (!match) continue;

      const [, key, rawValue] = match;

      // Already set wins, so an exported value overrides the file rather than the other
      // way round. That is what makes `DATABASE_URL=... pnpm db:migrate` work - and,
      // with two files, what makes .env.local override .env rather than the reverse.
      if (process.env[key]) continue;

      // Strip one layer of matching quotes, which is all a .env file ever carries.
      process.env[key] = rawValue.trim().replace(WRAPPING_QUOTES, "$2");
    }
  }
};
