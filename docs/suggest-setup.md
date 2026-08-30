# Wiring up `/lab/suggest`

Everything the song suggestion app needs that is not code. The database is in
`docs/neon-setup.md`; this is the Spotify half and the name filter.

The app is not built yet. These steps can be done now, in any order, and the page will
pick each one up as it lands.

---

## 1. Create the playlist

A **new** playlist, made for the lab, rather than one you already care about. If a bug
or a bored stranger does something you did not want, the blast radius should be a
playlist that exists only for this.

1. Create it in Spotify and make it **public**.
2. Copy the share link. It looks like
   `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...`
3. The id is the segment after `/playlist/`, before the `?`.

```
SPOTIFY_PLAYLIST_ID=37i9dQZF1DXcBWIGoYBM5M
```

It goes in `.env.local` and on the host. It is not a secret, but it does vary by
deployment, which is why it is a variable rather than a constant: staging pointing at
the real playlist would mean test adds on the playlist you actually listen to.

## 2. Mint the write token

Adding a track needs `playlist-modify-public`. That is a **second** refresh token
rather than a wider version of the existing one:

```sh
node scripts/spotify-token.mjs <client_id> <client_secret> write
```

Put the printed value in `.env.local` as `SPOTIFY_WRITE_REFRESH_TOKEN`, and on the
host. **Leave `SPOTIFY_REFRESH_TOKEN` alone.**

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

**Mint the write token first, then reload the homepage and check the now-playing panel
still works.** Two refresh tokens for one app and one account are expected to coexist,
and Spotify does not document it as a guarantee. The script prints the granted scopes
next to the token; read that line rather than assuming, because it is how you catch a
token that came back with more than was asked for.

Without the write token the site is unaffected and adding refuses with a 503. That is
the intended half-off state, not a broken one.

## 3. Turn on the name filter

Display names are three to ten characters and are checked against a blocklist. **The
blocklist ships empty, so until you do this it passes everything.**

The plaintext never enters the repository. `blocklist.txt` is gitignored; what gets
committed is a list of SHA-256 hashes, so a public portfolio does not carry a page of
slurs in it for a recruiter to find.

1. Create `blocklist.txt` in the repo root, one term per line. `#` starts a comment.
   ```
   # one term per line. gitignored. run pnpm build-blocklist after editing.
   somebadword
   anotherone
   ```
2. Build it:
   ```sh
   pnpm build-blocklist
   ```
3. Commit the regenerated `src/server/suggest/blockedTerms.json`. Keep
   `blocklist.txt` somewhere you will still have it in a year, because the hashes
   cannot be turned back into words.

### How the matching works, and what it will get wrong

A name is normalised before anything looks at it: lowercased, de-accented, with common
leet substitutions applied (`4` becomes `a`, `!` becomes `i`) and everything that is
not a letter removed. So `b4dw0rd`, `b.a.d.w.o.r.d` and `bàdwörd` all collapse to the
same string. Then every substring of three characters or more is hashed and looked up.

**Substring matching produces false positives, and there is no setting that avoids
that.** A display name is one token with no spaces, so a term padded into `xxwordxx`
is only catchable by looking inside the string, and looking inside the string is also
how an innocent name catches a short term it happens to contain.

The mitigation is the list, not the code:

- **Keep the entries long.** A three-letter term will misfire on ordinary names. A
  six-letter one very rarely will.
- **Keep them unambiguous.** If a term has an innocent meaning in some other language
  or as part of a longer word, it will find that word eventually.
- **Test after every change**, because you cannot read the list back:
  ```sh
  pnpm build-blocklist && pnpm test
  ```

This is not a moderation system. It stops the accidental and the lazy. Somebody
determined to get something through ten characters eventually will, and the real
backstop is that you delete the track in Spotify and the row goes with it.

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
| `SPOTIFY_PLAYLIST_ID` | `.env.local` and the host | The page says the playlist is not open yet. |
| `SPOTIFY_WRITE_REFRESH_TOKEN` | `.env.local` and the host | Reads work, adds refuse with a 503. |
| `DATABASE_URL` | `.env.local` and the host | List renders without names, adds refuse. See `docs/neon-setup.md`. |

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
