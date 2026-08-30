import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Reads .env.local into process.env, the way `next dev` does for the app.
 *
 * A standalone node script gets none of that: Next loads the env files, and nothing
 * loads them for scripts/. So every script here that needs a credential was one
 * `export` away from failing with "missing credentials" while the value sat in a file
 * three lines from the command being typed.
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

export const loadEnvLocal = () => {
  const here = dirname(fileURLToPath(import.meta.url));

  let contents;
  try {
    contents = readFileSync(join(here, "..", ".env.local"), "utf8");
  } catch {
    return; // No file. The host supplies the environment instead.
  }

  for (const line of contents.split("\n")) {
    const match = line.match(KEY_VALUE);
    if (!match) continue;

    const [, key, rawValue] = match;

    // Already set wins, so an exported value overrides the file rather than the other
    // way round. That is what makes `DATABASE_URL=... pnpm db:migrate` work.
    if (process.env[key]) continue;

    // Strip one layer of matching quotes, which is all a .env file ever carries.
    process.env[key] = rawValue.trim().replace(WRAPPING_QUOTES, "$2");
  }
};
