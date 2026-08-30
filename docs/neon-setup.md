# Wiring up the database

The lab apps share one Postgres database on [Neon](https://neon.tech). Today only
`/lab/suggest` uses it, for two things: who suggested each track, and how many
suggestions a visitor has spent that day. The slot machine and the roast will use the
same database when they are built.

Without `DATABASE_URL` nothing crashes. The suggestion list still renders, just
without names, and adding refuses with a 503 that says the playlist is not open yet.
Reads degrade, writes refuse out loud.

**Everything in the repo is done. These are the steps only you can do.**

---

## 1. Create the project

1. Sign in at <https://console.neon.tech> and click **New project**.
2. Name it whatever you like. `jaako-lab` is the obvious choice.
3. Pick the region closest to where the site is deployed, not to where you are. Every
   query is an HTTPS round trip from the serverless function, so the distance that
   costs you is the one between the host and the database.
4. Postgres version: take the default.

## 2. Copy the connection string

On the project dashboard, find **Connection string**.

**Take the pooled one.** It is the one whose host contains `-pooler`, and there is a
toggle or a dropdown labelled *Connection pooling* that switches between them. It
looks like this:

```
postgresql://<user>:<password>@ep-something-12345678-pooler.<region>.aws.neon.tech/neondb?sslmode=require
```

The unpooled string works too and will quietly cost you a connection per request under
any real load. Take the pooled one.

## 3. Local environment

Add it to `.env.local` in the repo root, which `.gitignore` already excludes:

```
DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require
```

`.env.example` lists it alongside the other variables. Restart `pnpm dev` afterwards,
because environment variables are read at server start rather than per request.

## 4. Create the tables

```sh
pnpm db:migrate
```

That applies every file in `src/server/db/migrations` that has not run yet, in
filename order, and records each one in a `schema_migration` table so it never runs
twice. Expect:

```
applying 001_suggest.sql
applied 1 migration(s).
```

Run it again and it will tell you there is nothing to do. It is safe to run as often
as you like.

The script reads `.env.local` itself through `scripts/loadEnv.mjs`, which the token
script shares, and anything already exported in the environment wins over the file. So
pointing it at production is one variable:

```sh
DATABASE_URL='postgresql://...' pnpm db:migrate
```

## 5. A branch for local work

**One project, two branches. Not two projects.**

A Neon branch is a copy-on-write clone with its own connection string, made in seconds
and costing almost no storage. Two projects would give the same isolation and two of
everything to manage.

    jaako-lab
    |- main    production        the host's environment variable
    `- dev     your laptop       .env.local

Create it in the console, or:

```sh
npx neonctl branches create --name dev
npx neonctl connection-string dev --pooled
```

**The migration runs per branch.** The `schema_migration` ledger lives *inside* each
database, so a branch that has never been migrated has no tables however many times you
have run the command elsewhere. This is the step that gets forgotten:

```sh
pnpm db:migrate                                       # .env.local, so dev
DATABASE_URL='<main pooled string>' pnpm db:migrate   # production
```

That second form works because `scripts/loadEnv.mjs` lets an exported value win over
the file.

**Resetting dev from main** is a click in the console, or `npx neonctl branches reset
dev --parent`. That is the payoff over separate projects: throwing away your test data
and re-cloning production is not a dump and a restore.

**If you are not deploying yet** you can skip `dev` and use `main` locally. The cost
is that your test suggestions become real rows, with invented names attached to real
tracks, that want cleaning up before launch. The branch takes thirty seconds; take it.

> Neon's free-tier limits on projects and branches change. Check what your plan allows
> rather than assuming two branches are free.

## 6. Deployment

Add `main`'s pooled string to the host as `DATABASE_URL` (Vercel: Settings →
Environment Variables), then redeploy. Run the migration against it once, using the
exported form above.

If the site is on Vercel, check the integrations marketplace first. Provisioning Neon
through it wires the variable in for you and saves this step.

---

## Adding a migration

Add a numbered `.sql` file to `src/server/db/migrations` and run `pnpm db:migrate`.

- **Zero-pad the number.** `002`, not `2`, or the tenth migration sorts before the
  second and the files apply in the wrong order.
- **Write every statement `if not exists`.** The ledger and the SQL should agree even
  if they ever disagree.
- **Never edit a migration that has already run anywhere.** The ledger records the
  filename, not the contents, so an edited file is simply never applied again. Write
  the next one instead.

There is no rollback and no generated diff, deliberately. That is what a migration
framework adds on top of this, and it is not worth a dependency for a schema this
size.

## What is in there

Two tables, and neither of them decides what is on the playlist. The playlist itself
is the source of truth: the page is built by reading it from Spotify and joining these
rows on by track URI.

| Table | Holds | Notes |
| --- | --- | --- |
| `suggestion` | One row per add: track URI, display name, visitor id, timestamp | Annotation only. A row here can describe a track and can never conjure one. |
| `visitor_day` | One row per visitor per day, with a count | The daily cap. The composite primary key is what the conditional upsert conflicts against. |
| `schema_migration` | Which migration files have run | Created by the migrate script, not by a migration. |

Removing a track in the Spotify app removes it from the page with no code involved,
and leaves an orphaned `suggestion` row that is invisible rather than wrong. Nothing
prunes those; delete them by hand if you ever care.

## When something is wrong

| Symptom | Cause |
| --- | --- |
| `DATABASE_URL is not set` from `pnpm db:migrate` | No `.env.local`, or the variable is not in it. |
| Suggestions render without names | The database is unreachable. The page degrades on purpose; the server logs the reason. |
| Adds answer 503 | Same, or the Spotify playlist is not configured. See `docs/suggest-setup.md`. |
| Queries are slow from production but fast locally | The project is in a different region from the host, or you took the unpooled connection string. |

Neon scales compute to zero when nothing is using it and resumes on the next query, so
the first request after a quiet spell is slower than the rest. That is the trade that
makes it free to leave a lab toy running, and it is not a bug to chase.
