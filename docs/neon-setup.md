# The database

The lab apps share one Postgres. On a laptop it lives in `.pgdata/` and comes with the
repo; in production it is a Neon branch. This document is mostly about the second one,
because the first needs no setup at all.

## Local: there is nothing to do

```sh
pnpm install
pnpm db:migrate
pnpm dev
```

`pnpm db:migrate` with no `DATABASE_URL` set creates a Postgres in `.pgdata/` and applies
every migration to it. That is the whole of it. No account, no connection string, no
container, no credential.

It is [PGlite](https://pglite.dev), Postgres compiled to WebAssembly, running inside the
node process. `pnpm db:verify` has used it since the fourth migration to decide whether a
migration is safe to run against real rows, so the engine was already here and already
trusted with a heavier job than holding your test data.

`.pgdata/` is gitignored and disposable. Delete it and run `pnpm db:migrate` again for a
clean slate, which is also how you throw away a week of test suggestions.

### One process at a time

PGlite does not lock its data directory, and this is the one sharp edge in the whole
arrangement. Two node processes will both open `.pgdata/` without complaint, both report
their writes committed, and leave only one side's behind. A container would have given us
mutual exclusion for free; this is what it costs not to have one.

So the repo locks it. Whoever opens the directory writes its pid to `.pgdata.lock`, and
anyone who finds that file belonging to a live process refuses:

```
The local database at .../.pgdata is already open in another process
(pid 41234, the dev server). PGlite gives no protection here: opening one
data directory twice silently discards one side's writes. Stop that
process and try again.
```

The dev server holds the lock for as long as it is up, so **stop `pnpm dev` before running
a db script**, and start it again after. A lock left behind by a crash is not a problem: the
next command sees a dead pid and takes over.

## The one rule

```
DATABASE_URL unset  ->  .pgdata/ on this machine          local
DATABASE_URL set    ->  a Neon branch                     a deployment
```

`src/server/db/index.ts` and `scripts/dbClient.mjs` both decide this way, and they have to
agree or the app and the scripts that maintain it would mean different things by "local".

**This rule is also the safety guard**, which is why it is written round this way. There
used to be one variable holding either a dev branch or the real one, told apart by an
endpoint id in the middle of a line of noise, and nothing in the repo could check which
you had. Now nothing local sets the variable, so its presence *is* the signal that you are
pointed at a deployment. `pnpm db:migrate` refuses without `--yes` when it is set, and
`pnpm db:which` will tell you where you are any time you are unsure.

## Why there is no NEON_API_KEY

Neon has two credential systems and they do not overlap.

| | What it is | What it does | Who uses it |
| --- | --- | --- | --- |
| `DATABASE_URL` | Postgres role and password | runs SQL | the app, psql, the db scripts |
| `NEON_API_KEY` | REST bearer token | creates, deletes and resets *branches* | `neonctl`, CI |

The API key never touches the data plane. There is no "connect with an API key" mode for
queries, so the app has never needed one and its absence from `.env.example` is a decision
rather than an oversight.

You would want one only for automation: creating a branch per pull request, or resetting
one on a schedule. Neither exists here yet. If it ever does, make a **project-scoped** key
rather than a personal one, so a leak is bounded by the project.

For the handful of branch operations below, `neon auth` signs you in through the browser
and needs no key at all.

---

## Production

### 1. Create the project

1. Sign in at <https://console.neon.tech> and click **New project**.
2. Name it whatever you like. `jaako-lab` is the obvious choice.
3. Pick the region closest to where the site is deployed, not to where you are. Every
   query is an HTTPS round trip from the serverless function, so the distance that costs
   you is the one between the host and the database.
4. Postgres version: take the default.

You want **one** long-lived branch, the default `main`. That is production. There is no
`dev` branch any more, because local development does not use Neon.

### 2. Give the host the connection string

On the project dashboard find **Connect**, turn **Connection pooling** on, and copy the
string. It is the one whose host contains `-pooler`:

```
postgresql://<user>:<password>@ep-something-12345678-pooler.<region>.aws.neon.tech/neondb?sslmode=require
```

The unpooled string works too and will quietly cost you a connection per request under any
real load. Take the pooled one.

Set it on the host as `DATABASE_URL` (Vercel: Settings, Environment Variables) and
redeploy. Do not put it in `.env.local`.

If the site is on Vercel, check the integrations marketplace first. Provisioning Neon
through it wires the variable in for you.

### 3. Migrate it, once, on purpose

```sh
DATABASE_URL='<main pooled string>' pnpm db:migrate --yes
```

`--yes` is required whenever `DATABASE_URL` is set. Migrations cannot be rolled back, and
this is the command that makes that irreversible change, so it asks you to mean it.

`scripts/loadEnv.mjs` lets an exported value win over `.env.local`, which is what makes the
one-line form above work.

---

## Releases, and the rc branch

Your git flow is `master` for production, feature work on `dev`, an `rc` branch cut before
a release, then a tag and a merge back to `master`. The databases line up with it like
this:

| Step | Database |
| --- | --- |
| feature work | `.pgdata/`, local, disposable |
| cut `rc`, verify | a Neon branch cloned from `main`, made now and deleted after |
| tag, merge to `master` | Neon `main` |

**The rc branch is meant to be thrown away.** A Neon branch is a copy-on-write clone, so
cloning production takes seconds and near-zero storage. That is what makes a two-day branch
worth making, and it is why there is no permanent second branch to keep in sync.

```sh
npx neonctl auth                                  # browser sign-in, no API key
npx neonctl branches create --name rc-2026-09     # cloned from the default branch
npx neonctl connection-string rc-2026-09 --pooled
```

Then point an afternoon at it:

```sh
DATABASE_URL='<rc pooled string>' pnpm db:migrate --yes   # prove the migration works on real data shapes
DATABASE_URL='<rc pooled string>' pnpm dev                # soak it
```

and when the tag ships:

```sh
npx neonctl branches delete rc-2026-09
```

**The ledger is per branch.** A branch cut from an already-migrated `main` inherits both
the tables and the `schema_migration` rows, so it is not bare. What is true is that the
ledgers are independent from the moment of the cut: a migration you add afterwards has to
be applied to `rc` and to `main` separately. That is the step that gets forgotten, and it
is exactly the two moments `--yes` is there to mark.

> Free plan, checked September 2026: 10 branches per project, 0.5 GB storage, 100 CU-hours
> a month, and compute suspends after 5 minutes of inactivity and cannot be kept awake.
> One permanent branch plus an occasional rc sits well inside that. Re-check if the shape
> of this changes.

Neon resuming from suspend is why the first request to production after a quiet spell is
slower than the rest. That is the trade that makes it free to leave a lab toy running, and
it is not a bug to chase. It is also one of the reasons local development no longer goes
anywhere near it.

---

## Where am I?

```sh
pnpm db:which
```

Prints the destination, whether `DATABASE_URL` is set, which migrations have been applied
and when, which are still pending, and a row count per table. It only ever reads, so it is
the one db command that is always safe to run when you are not sure what you are about to
do.

## Adding a migration

Add a numbered `.sql` file to `src/server/db/migrations`, stop the dev server, and run
`pnpm db:migrate`.

- **Zero-pad the number.** `002`, not `2`, or the tenth migration sorts before the second
  and the files apply in the wrong order.
- **Write every statement `if not exists`.** The ledger and the SQL should agree even if
  they ever disagree.
- **Never edit a migration that has already run anywhere.** The ledger records the
  filename, not the contents, so an edited file is simply never applied again. Write the
  next one instead.

There is no rollback and no generated diff, deliberately. That is what a migration
framework adds on top of this, and it is not worth a dependency for a schema this size.

## Checking a migration before you run it

```sh
pnpm db:verify
```

Applies every migration to a fresh Postgres and checks that it did what it says, then tells
you it is safe to migrate. It touches no database of yours, not even the local one: each
suite gets its own in-memory PGlite.

It is worth running because `pnpm db:migrate --yes` against production is a one-way door
pointed at rows that matter, and nothing else guards it. `tsc` cannot see inside a tagged
template, so a column renamed in a migration and missed in one store typechecks perfectly
and fails in production. The suite covers that case directly: every query is **lifted out
of the store source** and executed, rather than copied here where the copy could drift.

Six suites, each on its own fresh database: a never-migrated database, each of `004`, `005`
and `006` applied over rows written under the schema before it, the app's own queries, and
a deliberately broken migration that has to leave the schema untouched.

Add checks for a new migration in `scripts/db-verify.mjs`, in a suite of its own that seeds
the shape it migrates from. A migration that only works on an empty database is the one
worth catching.

## What is in there

None of these tables decides what is on the playlist. The playlist itself is the source of
truth: the queue is built by reading it from Spotify and joining these rows on by track
URI.

| Table | Holds | Notes |
| --- | --- | --- |
| `suggestion` | One row per add: track URI, visitor id, timestamp, and a snapshot of the track | Annotation only. A row here can describe a track and can never conjure one. |
| `visitor` | One row per visitor: display name, and the current day's add count | The identity and the daily cap on one row. `suggestion.visitor_id` is a foreign key to it. |
| `pack_rip`, `pack_card` | An opened deepcuts pack and the five cards out of it | One row per visitor per playlist per Manila day, with `opens` counting the re-openings. See `002_deepcuts.sql` and `006_one_pack_a_day.sql`. |
| `schema_migration` | Which migration files have run | Created by the migrate script, not by a migration. |

Removing a track in the Spotify app removes it from the queue with no code involved, and
leaves an orphaned `suggestion` row that is invisible rather than wrong. Nothing prunes
those; delete them by hand if you ever care.

**The snapshot columns on `suggestion` are history, not the source of truth.** `005` added
`track_name`, `artist`, `album`, `album_art`, `track_url` and `duration_ms` so that a
suggestion still says something readable after its track leaves the playlist. The queue
must keep rendering from the Spotify join. If anything ever renders the list out of these
columns instead, a removed track stops leaving the page and the page starts lying, which is
the exact property `001` was written to protect.

**`visitor_day` became `visitor` in `005`.** The grain moved from one row per visitor per
day to one row per visitor, the display name moved off every suggestion and onto it, and
`day` plus `adds` stayed as the current allowance bucket. The cap is still one statement
conflicting on a primary key, so it is still race-proof; the statement now resets the count
when the day has rolled over instead of relying on a new row missing the old key.

**A pack is one row, and `opens` is how many times it was torn open.** The deepcuts draw is
seeded on the visitor, the playlist and the Manila day, so re-opening a pack always dealt
the same five cards. The write had no matching guarantee until `006`: a second click wrote a
second rip and five more identical cards, and the collection showed each of them twice.
There is now a unique key on `(visitor_id, playlist_id, day)`, and the card writes are keyed
on `(rip_id, slot)` so a re-open is a no-op and a pack whose cards failed halfway repairs
itself the next time it is opened. `most opened` and `total rips` read `sum(opens)`, so both
figures still count openings exactly as they did before.

**Two columns are named for their format.** `suggestion.added_at_iso_datetime_utc` and
`pack_rip.ripped_at_iso_datetime_utc` are `text` holding an ISO 8601 instant in UTC, which
is what `src/oras` says is the only thing this codebase ever stores or transports. They sort
correctly as text because the writer always emits the same fixed-width shape, and a check
constraint refuses anything else. Neither has a default any more: the application decides
what time it is, not Postgres.

## When something is wrong

| Symptom | Cause |
| --- | --- |
| `refusing: DATABASE_URL is set` from `pnpm db:migrate` | Working as intended. A deployment is a deliberate target: add `--yes`, or unset the variable to migrate `.pgdata/`. |
| `relation "suggestion" does not exist` locally | `.pgdata/` was never migrated. Run `pnpm db:migrate`. |
| `is already open in another process` from a db script | The dev server has `.pgdata/`. Stop it, run the script, start it again. |
| A db script says a migration applied but the app disagrees | Only possible on a build predating the lock. Re-run `pnpm db:migrate` with the dev server stopped. |
| The lab pages are degraded and `pnpm db:which` says no local database | Expected before the first migrate. Run `pnpm db:migrate`. |
| Local data vanished | `.pgdata/` was deleted, which is a supported thing to do. Run `pnpm db:migrate`. |
| `Cannot find module '@electric-sql/pglite'` | devDependencies were skipped. It is a devDependency on purpose; production never takes that path. Run `pnpm install`. |
| `cannot insert multiple commands into a prepared statement` | A migration was run through the HTTP driver. `scripts/dbClient.mjs` uses `Pool` for exactly this reason; see its header. |
| Suggestions render without names in production | The database is unreachable. The page degrades on purpose; the server logs the reason. |
| Adds answer 503 | Same, or the Spotify playlist is not configured. See `docs/suggest-setup.md`. |
| Queries slow from production, fast locally | The project is in a different region from the host, or you took the unpooled connection string. Locally there is no network at all, so this comparison flatters the laptop. |
