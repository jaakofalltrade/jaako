import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The local Postgres directory, and the lock that keeps one process in it at a time.
 *
 * WHY THIS EXISTS AT ALL, because the obvious assumption is wrong and cost this repo a
 * review finding. PGlite does NOT lock its data directory. There is no postmaster.pid
 * check and no lock file anywhere in the shipped package: two Node processes will both
 * open the same directory, both report success, both commit, and the writes of whichever
 * closed first are silently gone. Measured, not assumed - two processes inserting one row
 * each into one directory leave one row behind.
 *
 * That turns the ordinary workflow into a data-loss bug. `next dev` holds .pgdata open
 * for its whole life, and the next thing the README tells you to do is run
 * `pnpm db:migrate`, which opens it again from a second process. The migration reports
 * success, the ledger row lands, and the dev server never sees the new tables.
 *
 * SO THE LOCK IS ADVISORY AND OURS. A file beside the data directory holds the pid of
 * whoever opened it and a word about what they are. Anyone else who finds it live refuses
 * out loud instead of corrupting. It is the same trade as the DATABASE_URL rule in
 * index.ts: make the dangerous state impossible to enter by accident rather than
 * documenting it and hoping.
 *
 * THE SAME PROTOCOL IS IMPLEMENTED IN scripts/pgdataLock.mjs, because src and scripts
 * share no code - there is no build step between them and nothing in src/ is reachable
 * from an .mjs. The file format IS the shared contract, so a change to one is a change to
 * both. That duplication is deliberate and is the same one scripts/dbClient.mjs already
 * makes for the DATABASE_URL rule.
 */

/** Where the local Postgres lives. Gitignored, disposable, and safe to delete. */
export const LOCAL_DATA_DIRECTORY = join(process.cwd(), ".pgdata");

/**
 * Beside the directory rather than inside it, so it can be taken before PGlite is asked
 * to create anything. A lock that only works once the thing it guards already exists
 * would not cover the case that creates it.
 */
const LOCK_FILE = `${LOCAL_DATA_DIRECTORY}.lock`;

/**
 * Whether a migrated cluster is actually there, which is a different question from
 * whether the directory is.
 *
 * PG_VERSION is written by initdb, so its presence means a real cluster and not a
 * leftover empty folder. hasDatabase() in index.ts needs this to tell "no database yet"
 * from "database with no schema", and those two used to look identical to it.
 */
export const hasLocalCluster = (): boolean =>
  existsSync(join(LOCAL_DATA_DIRECTORY, "PG_VERSION"));

/**
 * EPERM means the process is there and belongs to somebody else, which for this purpose
 * counts as running. Only ESRCH means nobody is home and the lock is stale.
 */
const isRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (cause) {
    return (cause as NodeJS.ErrnoException).code === "EPERM";
  }
};

type Holder = { pid: number; description: string };

const readHolder = (): Holder | null => {
  try {
    const [pid, ...rest] = readFileSync(LOCK_FILE, "utf8").trim().split(" ");
    const parsed = Number(pid);

    return Number.isInteger(parsed) && parsed > 0
      ? { pid: parsed, description: rest.join(" ") || "unknown" }
      : null;
  } catch {
    // Unreadable or gone between the failed write and here. Treat it as nobody's, which
    // the caller resolves by trying to take it exclusively again.
    return null;
  }
};

let held = false;

const release = (): void => {
  if (!held) return;
  held = false;

  try {
    // Only if it is still ours. A lock we already lost is not ours to delete.
    if (readHolder()?.pid === process.pid) unlinkSync(LOCK_FILE);
  } catch {
    // Best effort. A leftover file is recoverable - the next claim sees a dead pid and
    // takes it - and throwing on the way out of the process helps nobody.
  }
};

/**
 * Take the directory, or explain who has it.
 *
 * `as` is what the holder will be called in the other process's error, so it should be
 * the command a reader would recognise: "next dev", "pnpm db:migrate".
 *
 * THE STALE CASE IS A RACE AND IS ALLOWED TO BE. If two processes both find the same dead
 * pid they can both try to take over, and one of them loses the exclusive create and
 * refuses. That is the correct outcome and the window is a few microseconds wide; the
 * alternative is a real lock manager for a folder on one laptop.
 */
export const claimLocalDataDirectory = (args: { as: string }): void => {
  const mine = `${process.pid} ${args.as}`;

  const take = (): boolean => {
    try {
      writeFileSync(LOCK_FILE, mine, { flag: "wx" });
      return true;
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== "EEXIST") throw cause;
      return false;
    }
  };

  if (!take()) {
    const holder = readHolder();

    // Our own pid means this module was re-evaluated in a process that already holds the
    // lock, which is what an HMR reload of the dev server looks like.
    if (holder && holder.pid !== process.pid && isRunning(holder.pid)) {
      throw new Error(
        `The local database at ${LOCAL_DATA_DIRECTORY} is already open in another ` +
          `process (pid ${holder.pid}, ${holder.description}). PGlite gives no ` +
          `protection here: opening one data directory twice silently discards one ` +
          `side's writes. Stop that process and try again.`
      );
    }

    // Stale, or already ours. Drop it and take it properly so the pid on disk is right.
    try {
      unlinkSync(LOCK_FILE);
    } catch {
      // Someone else got there first; the retry below is what decides it.
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
    // Only the synchronous exit hook, because that is the one that runs on a normal exit
    // and on an uncaught throw. A stale file left by a kill -9 costs nothing: the next
    // claim finds a dead pid and takes over.
    process.on("exit", release);
  }
};
