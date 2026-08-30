# Wiring up the `now_playing` panel

The panel on the homepage reads the live Spotify account via a server-side route
handler at `/api/spotify/now-playing`. Without credentials it renders an
"offline" state — the site works fine, it just doesn't show a track. These are
the steps to make it show a real one.

## 1. Register the app

1. Go to <https://developer.spotify.com/dashboard> and click **Create app**.
2. Name and description can be anything.
3. **Redirect URI** — enter exactly:

   ```
   http://127.0.0.1:8888/callback
   ```

   Use the loopback IP, not `localhost`. Spotify tightened this in April 2025:
   plain HTTP redirect URIs are rejected except for explicit loopback literals
   (`127.0.0.1`, `[::1]`). `http://localhost:8888/callback` will fail with
   `INVALID_CLIENT: Insecure redirect URI`.
4. Tick **Web API** under "Which API/SDKs are you planning to use?".
5. Save, then open **Settings** and copy the **Client ID** and **Client secret**.

## 2. Mint a refresh token

Access tokens expire after an hour; the refresh token is the long-lived one the
server keeps. Put the client id and secret in `.env.local` first (step 3 below, they
are the same two values), then run the helper once:

```sh
pnpm token:read
```

It reads `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` out of `.env.local`, so
there is nothing to pass and nothing to paste into your shell history. Anything already
exported in the environment still wins over the file, and the credentials can still be
given as arguments if you would rather not put them in a file at all.

It starts a throwaway listener on `127.0.0.1:8888`, prints a consent URL, and
waits. Open the URL, approve access, and the script prints:

```
SPOTIFY_REFRESH_TOKEN=AQD...
```

The scopes requested are `user-read-currently-playing`, `user-read-recently-played`
and `user-top-read` — all read-only, no playback control.

### If the token comes back with the wrong scopes

The script refuses to print it, and says so. The cause is nearly always the browser
opening a **cached authorize URL from an earlier run** instead of the one just printed:
the address bar autocompletes, the old page asks for the old scopes, and what you get
back is a perfectly valid token for the wrong job.

Copy the URL rather than typing into the address bar, close any Spotify authorization
tabs left open, and check that the consent screen names the scope the terminal asked
for. `pnpm token:check` confirms both stored tokens afterwards.

### The second token

The site holds **two** refresh tokens for the same account, and `/lab/suggest` is why.
Spotify's scopes are verbs rather than resources, so no token can be restricted to a
single playlist. The next best thing is a token per job:

| | Scopes | Used by |
| --- | --- | --- |
| `SPOTIFY_REFRESH_TOKEN` | the three read scopes above | the panel, the statistics, and the lab's search proxy |
| `SPOTIFY_WRITE_REFRESH_TOKEN` | `playlist-modify-public` only | the one route that adds a track |

The read token **cannot write to anything**, which matters most for the search proxy:
that route is public and unauthenticated, and this is the credential it spends. The
write token cannot touch a private playlist, because `playlist-modify-private` is a
separate scope and is never requested.

Mint the second one with:

```sh
pnpm token:write
```

**Do this one first, then reload the homepage and check the panel still works.** Two
refresh tokens for one app and one account are expected to coexist, and Spotify does
not document that as a guarantee. The script prints the scopes that were actually
granted alongside the token; read that line rather than assuming, because it is how you
catch a token that came back carrying more than was asked for.

Only `/lab/suggest` needs the write token. Without it the rest of the site is
unaffected and adding a track refuses with a 503.

> **Rotating an existing token.** `pnpm token:read` re-mints the read one and
> `pnpm token:write` the write one; the script defaults to `read` when neither is
> named, so the original bare command still does exactly what it always did.
> `user-top-read` was added for the listening
> statistics cell in the instrument strip. A refresh token minted before that scope
> existed will keep working for now-playing but Spotify will answer `403` for
> `/me/top/*`, and the statistics cell renders its unavailable state instead. Re-run
> this script and replace `SPOTIFY_REFRESH_TOKEN` to enable it. Nothing else breaks in
> the meantime — the service never throws.

## 3. Local environment

Create `.env.local` in the repo root (already ignored by the `.env*` rule in
`.gitignore`):

```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REFRESH_TOKEN=...
```

Restart `pnpm dev` — env vars are read at server start, not per request.

## 4. Deployment

Add the same three variables to the host's environment settings (Vercel:
Settings → Environment Variables), then redeploy.

Refresh tokens don't expire on a timer, but they *are* invalidated if you
rotate the client secret or revoke the app under
<https://www.spotify.com/account/apps/>. If the panel silently goes offline in
production, that's the first thing to check — the route logs
`[spotify] now-playing failed:` server-side with the underlying status code.

## How it behaves

| Situation | Panel shows |
| --- | --- |
| Track playing | Cover spinning in color, green blinking `now playing`, live progress bar |
| Track paused | Same cover, grayscale and still, `last played` |
| Spotify closed | Most recent play promoted to the hero slot, grayscale, `last played` |
| No credentials / API error | Static disc icon, `offline` |

The panel fetches **once when the page loads** — it doesn't poll. Reload to
update. The progress bar ticks forward on its own after that, but it's
extrapolating from the load-time position, not re-checking Spotify.

To turn on polling later, add an interval to the fetch effect in
`src/design-system/portfolio/NowPlaying.tsx`.
