import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The scripts' half of the .pgdata lock. src/server/db/localDataDirectory.ts is the other
 * half, and the two implement one protocol.
 *
 * WHY THERE ARE TWO OF THESE. There is no build step between scripts/ and src/, and
 * nothing under src/ is importable from an .mjs, so the code cannot be shared. The FILE
 * FORMAT is the shared contract - a pid and a description, one space between them - and a
 * change to either side is a change to both. scripts/dbClient.mjs already duplicates the
 * DATABASE_URL rule for exactly this reason.
 *
 * Read the long note in src/server/db/localDataDirectory.ts for why a lock is needed at
 * all. The short version: PGlite does not lock its own data directory, so two processes
 * open it happily and one of them loses every write it made.
 */

/**
 * FROM THIS FILE, NOT FROM process.cwd(). A script resolves its migrations from its own
 * path, and the data directory has to be resolved the same way or the two disagree: run
 * from scripts/ with a cwd-based path and migrate.mjs finds all six migrations and
 * applies them to a brand-new scripts/.pgdata, reporting success, while the database the
 * app opens stays empty.
 *
 * next dev always runs with the project root as its cwd, so the join in
 * localDataDirectory.ts lands on this same absolute path.
 */
const REPOSITORY_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const LOCAL_DATA_DIRECTORY = join(REPOSITORY_ROOT, ".pgdata");

const LOCK_FILE = `${LOCAL_DATA_DIRECTORY}.lock`;

/**
 * Whether a migrated cluster is there, rather than merely a directory. PG_VERSION is
 * written by initdb, so it is the file that separates a real cluster from an empty
 * folder somebody's tooling left behind.
 */
export const hasLocalCluster = () =>
  existsSync(join(LOCAL_DATA_DIRECTORY, "PG_VERSION"));

/** EPERM means somebody else's live process. Only ESRCH means the lock is stale. */
const isRunning = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (cause) {
    return cause.code === "EPERM";
  }
};

const readHolder = () => {
  try {
    const [pid, ...rest] = readFileSync(LOCK_FILE, "utf8").trim().split(" ");
    const parsed = Number(pid);

    return Number.isInteger(parsed) && parsed > 0
      ? { pid: parsed, description: rest.join(" ") || "unknown" }
      : null;
  } catch {
    return null;
  }
};

/**
 * Who has the directory, without trying to take it.
 *
 * A script that only reads wants to say "the dev server has this, stop it" rather than
 * fail, and it cannot learn that from a function whose only outcomes are success and a
 * throw. Returns null when the lock is free or stale.
 */
export const localDataDirectoryHolder = () => {
  const holder = readHolder();
  return holder && holder.pid !== process.pid && isRunning(holder.pid) ? holder : null;
};

/** Per process, for the same reason src/server/db/localDataDirectory.ts says. */
let held = false;

const release = () => {
  if (!held) return;
  held = false;

  try {
    if (readHolder()?.pid === process.pid) unlinkSync(LOCK_FILE);
  } catch {
    // Best effort. A leftover file is recoverable by the next claim's staleness check.
  }
};

/**
 * Take the directory, or throw naming whoever has it.
 *
 * `as` is how this process will be described in the other one's error, so pass the
 * command a reader would recognise: "pnpm db:migrate".
 */
export const claimLocalDataDirectory = (args) => {
  const mine = `${process.pid} ${args.as}`;

  const take = () => {
    try {
      writeFileSync(LOCK_FILE, mine, { flag: "wx" });
      return true;
    } catch (cause) {
      if (cause.code !== "EEXIST") throw cause;
      return false;
    }
  };

  if (!take()) {
    const holder = readHolder();

    if (holder && holder.pid !== process.pid && isRunning(holder.pid)) {
      throw new Error(
        `The local database at ${LOCAL_DATA_DIRECTORY} is already open in another ` +
          `process (pid ${holder.pid}, ${holder.description}). PGlite gives no ` +
          `protection here: opening one data directory twice silently discards one ` +
          `side's writes. Stop that process and try again.`
      );
    }

    try {
      unlinkSync(LOCK_FILE);
    } catch {
      // Someone else got there first; the retry decides it.
    }

    if (!take()) {
      const winner = readHolder();
      throw new Error(
        `The local database at ${LOCAL_DATA_DIRECTORY} was claimed by another process ` +
          `(pid ${winner?.pid ?? "unknown"}, ${winner?.description ?? "unknown"}) ` +
          `while this one was starting. Try again.`
      );
    }
  }

  if (!held) {
    held = true;
    process.on("exit", release);
  }
};

/** Give the directory up before the process ends, so a long-lived script can reopen. */
export const releaseLocalDataDirectory = release;
