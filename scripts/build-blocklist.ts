import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTerm } from "../src/server/suggest/normalizeTerm";

/**
 * Turns blocklist.txt into src/server/suggest/blockedTerms.json.
 *
 *     pnpm build-blocklist
 *
 * blocklist.txt is one term per line, ignored by git, and it is the only place the
 * plaintext ever exists. What gets committed is the SHA-256 of each normalised term,
 * so this repository can be public without carrying a page of slurs in it. See the
 * header of src/server/suggest/blocklist.ts for why hashing is workable here at all.
 *
 * TYPESCRIPT, RUN THROUGH tsx, WHERE THE OTHER TWO SCRIPTS ARE PLAIN .mjs. That is
 * deliberate and it is the whole reason tsx is a dependency: this script and the
 * runtime MUST normalise identically or the hashes never match, and the failure is
 * silent — nothing throws, the filter simply passes everything. Importing the one
 * normaliser removes that possibility instead of documenting it.
 *
 * Re-run it whenever blocklist.txt changes, and commit the JSON.
 */

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "blocklist.txt");
const target = join(here, "..", "src", "server", "suggest", "blockedTerms.json");

const sha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

const run = () => {
  let contents: string;

  try {
    contents = readFileSync(source, "utf8");
  } catch {
    console.error(
      `no blocklist.txt found at ${source}\n` +
        "Create one, a term per line. It is gitignored. See docs/suggest-setup.md."
    );
    process.exit(1);
  }

  const terms = contents
    .split("\n")
    .map((line) => line.trim())
    // `#` comments, so the list can explain itself to the one person who reads it.
    .filter((line) => line && !line.startsWith("#"))
    .map(normalizeTerm)
    // A term that normalises to nothing, or to fewer letters than the shortest
    // allowed name, can never match and would only pad the file.
    .filter((term) => term.length >= 3);

  // Sorted and de-duplicated so the committed file does not churn when the source is
  // reordered, which would make every edit to the list a noisy diff.
  const hashes = [...new Set(terms)].map(sha256).sort();

  writeFileSync(target, `${JSON.stringify(hashes, null, 2)}\n`, "utf8");
  console.log(`wrote ${hashes.length} hashed term(s) to ${target}`);
};

run();
