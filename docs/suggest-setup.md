# Wiring up `/lab/suggest`

Everything the song suggestion app needs that is not code. The database is in
`docs/neon-setup.md`; this is the Spotify half and the name filter.

The app is not built yet. These steps can be done now, in any order, and the page will
pick each one up as it lands.

---

## 1. The playlists — already done

Two of them, both public, both owned by the site's Spotify account. Which one a
deployment writes to is decided in `src/server/serverConfig.ts`:

| Deployment (`ENV`) | Playlist | Constant |
| --- | --- | --- |
| `PRODUCTION` | [4eJiWoi2LBHIxFq2JqDvlo](https://open.spotify.com/playlist/4eJiWoi2LBHIxFq2JqDvlo) | `SUGGEST_PLAYLIST_ID_PRODUCTION` |
| `LOCAL`, `STAGING` | [2CK3Ap0UNSCwatm9cIijx2](https://open.spotify.com/playlist/2CK3Ap0UNSCwatm9cIijx2) | `SUGGEST_PLAYLIST_ID_DEVELOPMENT` |

Both live in `src/constants/suggest.ts`, so nothing has to be set for the page to
render: a fresh clone shows a live playlist straight away, and `pnpm dev` cannot add to
the production one.

The sandbox is the original **Portfolio Playlist**, so what is on it is real suggestion
history rather than test data — worth knowing before you empty it.

> ### `ENV` decides this, so `ENV` now matters
>
> `toEnv` falls back to `LOCAL` for anything unset or unrecognised. While the three
> configs were identical that cost nothing. It is not free any more: **an unset `ENV` on
> the production host sends real visitor adds to the sandbox playlist**, with no error
> and nothing in the logs to say so.
>
> Set `ENV=PRODUCTION` on the production host. Then set `SPOTIFY_PLAYLIST_ID` there as
> well — it overrides whatever the tier resolved to, which turns a missing `ENV` from a
> wrong playlist into a cosmetic bug. Belt and braces, because the failure is silent.

`SPOTIFY_PLAYLIST_ID` overrides the tier's choice on any deployment. Use it to give
staging a third playlist of its own, or as the guard above.

> **If you ever swap either for a different playlist,** make it a new one rather than
> something you already care about. Public, so `playlist-modify-public` is enough and
> the write token never needs the private scope.

## 2. Mint the write token

Adding a track needs `playlist-modify-public`. That is a **second** refresh token
rather than a wider version of the existing one:

```sh
pnpm token:write
```

The client id and secret come from `.env.local`, so there is nothing to pass. Put the
printed value back in `.env.local` as `SPOTIFY_WRITE_REFRESH_TOKEN`, and on the host.
**Leave `SPOTIFY_REFRESH_TOKEN` alone.**

### What this does and does not protect

Two different problems, and it is worth keeping them apart.

**A visitor can never write to another playlist**, and that has nothing to do with
scopes. The add route takes `{ track_uri, name }` and no playlist id; the destination
comes from `SPOTIFY_PLAYLIST_ID` server-side. There is no request anybody can
construct that names a different playlist. If a playlist id ever appears in the request
body, that is the bug, and `src/models/ServerConfig.ts` says so where the field is
declared.

**The scope split is about a leaked credential, or our own bug.** Everything the site
reads, including the public unauthenticated search proxy, runs on a token that cannot
write at all. The write token is reached by one route.

What is left, stated plainly so it is a decision rather than a surprise: **if the write
token leaks, it can reorder or delete tracks in the public playlists on this account.**
Not private ones, since `playlist-modify-private` is never requested. Not anyone
else's. Not the account itself. Revoking the app at
<https://www.spotify.com/account/apps/> stops it in one click.

If that residual ever stops being acceptable, the fix is a second Spotify account whose
only public playlist is this one, then following that playlist from your main account so
it still shows up in your library and your listening history. The cost is one more email
and the playlist showing a different owner name.

### Before you rely on it

**Check what you actually minted:**

```sh
pnpm token:check
```

It refreshes both stored tokens and prints the scopes each one was granted, so a write
token that is really a read token is one line of output rather than a 403 from Spotify
weeks later, at the moment somebody is trying to add a song. The two commands differ by
one word and the values they print look alike, which is the usual cause.

**Mint the write token first, then reload the homepage and check the now-playing panel
still works.** Two refresh tokens for one app and one account are expected to coexist,
and Spotify does not document it as a guarantee. The script prints the granted scopes
next to the token; read that line rather than assuming, because it is how you catch a
token that came back with more than was asked for.

Without the write token the site is unaffected and adding refuses with a 503. That is
the intended half-off state, not a broken one.

## 3. The name filter — nothing to do

Display names are three to ten characters and are checked against
[obscenity](https://www.npmjs.com/package/obscenity), which ships its own maintained
English dataset. There is no word list in this repository and none for you to write.

It replaced a hand-rolled filter that hashed every substring of the name against a
committed list of SHA-256 hashes. That kept the terms out of a public repo, which was
the point of it, and it had one flaw it could not fix: substring matching over a
ten-character field cannot tell a padded slur from an ordinary name that happens to
contain a short one. Measured before the swap, these all pass now and could not have
been promised before:

    scunthorpe   assassin   analyst   class   grapes   shitake   cockburn

**If a real name is ever refused,** the fix belongs in the dataset rather than at the
call site: build a copy of `englishDataset` in `src/server/suggest/blocklist.ts`
with a whitelisted term added. `createBlocklist` takes its matcher as an argument, so
the change is local and testable.

**It is a heuristic, not a judge**, which is the library author's own framing. It stops
the accidental and the lazy. Somebody determined to get something through ten
characters eventually will, and the real backstop is that you delete the track in
Spotify and the row goes with it.

## 4. Turn the app on

Once the code is built:

- `src/data/lab.ts`: change `suggest.status` from `LabStatus.Planned` to
  `LabStatus.Live`. The badge on the lab index turns cyan by itself.
- `src/data/site.ts`: the footer ticker says **"no cookies, no newsletter"** on every
  page, and this app sets a visitor cookie. The cookie is only set on a successful
  add, so somebody who merely reads the playlist is still never given one, but the
  line needs to change.

---

## The variables

| Variable | Where | Without it |
| --- | --- | --- |
| `SPOTIFY_PLAYLIST_ID` | optional | Defaults to the real lab playlist. Set it only to point a deployment elsewhere. |
| `SPOTIFY_WRITE_REFRESH_TOKEN` | `.env.local` and the host | Reads work, adds refuse with a 503. |
| `DATABASE_URL` | `.env.local` and the host | List renders without names, adds refuse. See `docs/neon-setup.md`. |

## What the API actually returns

Written down because it differs from Spotify's older documentation in three ways, and
each one fails by returning a 200 with no data rather than an error.

1. The playlist object's paging field is **`items`**, not `tracks`. A `fields`
   projection asking for `tracks(total)` comes back with the key simply absent.
2. The collection is read from **`/playlists/{id}/items`**. The `/tracks` sub-path
   answers **403 Forbidden**, even to the owner of a public playlist.
3. Inside a page, the track hangs off **`item`**, not `track`.

All three were measured against this playlist rather than assumed. `src/server/endpoints.ts`
carries the projections, and `toPlaylistSummary` in `mappers.test.ts` pins the shape.

**Still unverified:** whether adding is `POST /playlists/{id}/items` or the older
`/tracks`. Given the GET behaviour above it is very likely `/items`, but confirming
it means making a write, which needs the write token first. Check it before trusting
the add route.

## The numbers

All in `src/constants/suggest.ts`, all one-line changes.

| | Value | |
| --- | --- | --- |
| Display name | 3 to 10 characters | Ten does not fit "christopher". Deliberate. |
| Adds per visitor per day | 3 | The same number as the slot machine's pulls. |
| Longest track | 10 minutes | Stops a DJ set being parked on the playlist. |
| Search results shown | 8 | |
| Search cache | 5 minutes, 200 queries | Identical queries are served from memory. |
| Playlist rows read | 100 | Tracks are inserted at position 0, so the playlist is newest-first and this is always the newest 100. |
