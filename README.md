# Jaako.xyz

Simple portfolio website since I ain't got one yet, also I might add other projects here rather than creating a another repository and deploying it separately.

## Tech stacks I used

- Nextjs (I guess easier to add more apps and projects, server is also deployed alongside the client)
- Typescript (This is a no-brainer anyone not using Typescript in the big 25 should get lynched respectfully)
- Scss (Just preference)
- Pnpm (Just faster, and packages are stored globally)
- Postgres (Neon in production, and a local one in `.pgdata/` that comes with the repo)

## How to run

Make sure you have the latest Nodejs installed then install pnpm via npm.

```sh
pnpm install
pnpm db:migrate
pnpm dev
```

That's the whole thing. No `.env.local`, no signing up for anything, no Docker.

`pnpm db:migrate` builds a real Postgres in `.pgdata/` and applies every migration to it. It's PGlite, which is Postgres compiled to WebAssembly, so it runs inside the node process and there's no server to install or port to fight over. The folder is gitignored and disposable: delete it and run the command again to get a clean slate.

**One process at a time.** PGlite doesn't lock its own data directory, and two processes sharing one will each think they've written to it while one of them silently loses everything it did. So the repo locks it: the dev server takes `.pgdata` while it's up, and any db script that finds it held refuses and tells you which pid has it. In practice that means stop `pnpm dev` before `pnpm db:migrate`, then start it again.

The site comes up with the lab apps fully working against that database. What you *won't* have is anything that needs a third party, which is the next section.

## Optional credentials

Everything below is optional and every one of them degrades on purpose rather than crashing. Copy `.env.example` to `.env.local` and fill in only the ones you care about.

| Variable | For | Without it |
| --- | --- | --- |
| `SPOTIFY_CLIENT_ID` / `_SECRET` / `_REFRESH_TOKEN` | the now playing panel, the suggest queue | panel shows its offline state |
| `SPOTIFY_WRITE_REFRESH_TOKEN` | adding a track on `/lab/suggest` | the page works, adding refuses |
| `LASTFM_API_KEY` | play counts on `/lab/deepcuts` | packs open, every track reads "unmatched" |
| `RESEND_API_KEY` | the contact form | `/api/contact` answers 503, form points at the email link |

Setup for each is in `docs/spotify-setup.md`, `docs/lab.md` and `docs/contact-setup.md`.

**Leave `DATABASE_URL` blank.** It's the local/production switch: blank means the local Postgres above, and set means you're talking to a real Neon branch. See `docs/neon-setup.md` before you put anything in it.

## Commands

| Command | Does |
| --- | --- |
| `pnpm dev` | dev server |
| `pnpm build` / `pnpm start` | production build and run |
| `pnpm test` | vitest, pure functions only |
| `pnpm lint` | eslint |
| `pnpm db:migrate` | apply pending migrations |
| `pnpm db:which` | which database am I on, what's applied, how many rows |
| `pnpm db:verify` | run every migration against a throwaway Postgres and check it did what it says |
| `pnpm db:wipe-packs` | empty the deepcuts tables, dry unless `--yes` |
| `pnpm token:read` / `token:write` / `token:check` | mint and inspect Spotify refresh tokens |
| `pnpm lastfm:check` | check the last.fm key works |
| `pnpm playlist:id <url>` | turn a Spotify share link into a playlist id |
| `pnpm cards:backfill` | put artwork back on old deepcuts cards |
| `pnpm ladder:spread` | deepcuts rarity tuning |
| `pnpm build-icons` | rebuild the icon sprite |

## Adding a migration

Drop a numbered `.sql` file in `src/server/db/migrations`, run `pnpm db:verify`, then stop the dev server and run `pnpm db:migrate`. Zero-pad the number, write everything `if not exists`, and never edit one that's already run. Details and the reasoning in `docs/neon-setup.md`.

## Notes:

Might deploy to Vercel since the price is pretty promising, also I used NextJs since chatgpt convinced me that it's cost effective rather than deploying server side apps separately.
