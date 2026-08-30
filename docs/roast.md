# `/lab/roast` : spotify roast

An agent reads a person's listening data and is unkind about it.

This document is the agreed plan for the third lab app. `docs/lab.md` is the parent
and still holds the decisions shared across all three, including why the lab exists,
the route layout, the CSS Modules exception and the bare shell. Read that first. What
follows only covers what is specific to the roast, and it supersedes the shorter
`/lab/roast` section in `lab.md` wherever the two disagree.

Nothing here is built. `src/app/lab/(bare)/roast/page.tsx` is a static teaser wearing
the final design, and everything below describes what replaces it.

---

## Why there is a waitlist

This is the constraint that shapes the whole app, it is not obvious, and it has
nothing to do with how much data the app reads. Written out because every future
decision on this page bends around it.

Every application registered at `developer.spotify.com/dashboard` starts in
**Development Mode**. In that mode the app carries an allowlist: a table in the
dashboard holding at most **25 users**, each added by hand as a full name plus the
email address on their Spotify account.

Enforcement happens at Spotify's `/authorize` screen, before any of our code runs.
Spotify checks the signed-in account against the app's allowlist. If it is on the
list, the normal consent screen appears. If it is not, the visitor is refused there
and bounced back to our `redirect_uri` with an error. No token is issued, and there is
nothing a server can do to rescue it.

Three things follow, and all three were misunderstood at some point while planning
this:

- **Read-only does not exempt an app.** The cap applies whatever scopes are asked
  for. Apps that only read listening history are capped exactly like apps that write.
- **It is not a rate limit.** Not 25 per day, not 25 concurrent, not 25 roasts. It is
  25 rows in a list. The same 25 people can use it a thousand times.
- **Receiptify and Obscurify are subject to the same rule.** They serve strangers
  because they were granted a **quota extension**, which moves an app to Extended
  Quota Mode where any Spotify user can authorise it. Before that, each of them was
  also capped at 25 hand-entered emails.

The real cost is not the number. It is that every single user is a manual round trip:
they send their Spotify email, it is pasted into the dashboard by hand, and they are
told to try again.

**So the refused visitor is a designed state, not an error.** They get the mechanism
above explained honestly and a form asking for one of the seats, which reuses the
Resend pipeline and the validation behind the contact form. A limit presented as an
invite list is better than a limit presented as a failure.

Open: whether to submit for a quota extension at all. Personal projects are often
declined, and being declined costs nothing but time.

---

## Decisions

### A second Spotify application

**The roast gets its own app registration**, with its own client id, secret and
redirect URI, used by `/lab/roast` and nothing else. Two entries in the dashboard.

This is not tidiness. `src/server/spotify/auth.ts` already documents the reason in
capitals: **Spotify grants scopes per (user, application), not per token.** Approving
a new scope updates the grant for that pair and invalidates access tokens already
issued against it, including one a warm server is holding in module scope. The file
has an `invalidateAccessToken` export because this already happened once, when
`playlist-modify-public` was approved for `/lab/suggest`.

The roast wants `user-library-read` and `playlist-read-private`, which the site's
owner token has never requested. On a single application, the first time the owner
logs into the roast to test it, with the same account whose refresh token powers the
now-playing dock, that grant widens and the dock's cached token dies. That is not a
risk, it is the documented behaviour, and it would fire on every test run that changed
the scope list.

A second application makes the grant a different row entirely. App A's token is
untouched, and the roast can be tested a hundred times without the portfolio noticing.
It also gives the roast its own independent 25-seat allowlist.

Rejected: reusing the existing credentials. One fewer pair to rotate, nothing new to
register, and it accepts breaking the live dock on every scope change. The saving is
two environment variables. The cost is a recurring, already-observed outage of an
unrelated page.

### Nothing is stored

No database, no token store, no migration, no table.

The callback exchanges the authorisation code, fetches everything from Spotify,
computes the digest, and **discards both tokens**. The refresh token is never written
down: not to Neon, not to a cookie, not to disk. A second roast means clicking login
again, which is one click because Spotify remembers the consent.

This removes the largest single chunk of work from the build. `docs/lab.md` describes
the roast as needing "a second token store and a callback route". Half of that turns
out to be avoidable: the app only ever needs the token for the few seconds between the
callback and the fetch, so holding it for an hour buys nothing and costs a store, a
refresh path, an expiry story and a set of live credentials to protect.

Rejected: persisting refresh tokens in Neon. Required if the app ever wants scheduled
roasts or taste-over-time comparisons, neither of which is planned. Rejected also: an
encrypted cookie holding the access token, which survives a page refresh but puts a
live Spotify credential in the browser to buy a convenience the flow does not need.

### The handoff

Because the tokens die at the callback, the listening data has to reach the page some
other way. The callback route does the whole job and renders the result:

    /api/lab/roast/callback
      exchange code for tokens
      fetch the Spotify data
      compute the digest
      discard the tokens
        |
        '-> render /lab/roast with the digest in hand
              client posts the digest back
                '-> /api/lab/roast/stream returns the roast

No cookie, no store, no second Spotify round trip. The digest travels through the
client, which is safe here because it is the visitor's own listening data. Tampering
with it changes nothing except which jokes they get told about themselves.

Rejected: a short-lived encrypted cookie carrying the digest. Survives a refresh and
keeps the payload off the client, at the cost of an encryption key and a size budget
that playlist names would eat into.

### Two voices, one API call

The design needs bubbles that arrive one at a time, and it needs the agent reacting
while the data is being read. A single structured response cannot do the second part:
the model says nothing until it has finished thinking, and at Opus with a brutal
brief that is a long silence behind a typing indicator, which is exactly the loading
state the design exists to avoid.

So there are two sources, and only one of them is the model.

**The reading beats are templated from the numbers.** Written by hand, filled from the
digest as each Spotify call returns. "oh. 340 plays. of one song." They appear
instantly, they cost nothing, they are deterministic enough to tune precisely, and
they cover the wait. They repeat across visitors who trip the same thresholds, which
is the accepted cost.

**The verdict is one Claude call**, returning a structured response that is split into
bubbles. One call, one voice, reliable segmentation.

Rejected: a streamed call split on a delimiter. Preserves true streaming and lets the
model own its own comic beats, but segmentation then depends on the model remembering
the sentinel. Rejected: one call per bubble, which multiplies cost and latency by the
bubble count.

Unresolved, worth a spike before committing: whether `output_config.format` and
streaming compose in the TypeScript SDK. If they do, the verdict can stream as a
partially-parsed JSON array and get both properties at once. If they do not, the
structured response arrives whole and the reading beats have to cover the entire wait.
Ten minutes of work to find out, and it should happen before the client is written.

### A computed digest, not raw Spotify

The model receives facts that have already been worked out, not trimmed API responses.

Comedy comes from specificity, and picking which number is the funny one is a job the
code does better and more consistently than the model does. The digest surfaces
outliers deliberately:

    top_artist_share      one artist owning half the top ten
    repeat_king           the track and its play count
    night_cluster         plays between 02:00 and 04:00
    saved_total           liked songs, from /me/tracks?limit=1
    genre_spread          how narrow the taste actually is
    recent_vs_top         what arrived in the last four weeks and took over
    playlist_names        titles, which say more than contents

The same computed stats feed the templated reading beats, so it is built once and
spent twice. The prompt is also smaller, cheaper and more predictable.

Rejected: dumping raw JSON and letting the model find its own angle. It will
occasionally spot a connection nobody would have written a rule for, and it will also
fixate on something boring. Worth an A/B against the digest once both exist, but not
worth building first.

### The share card

**Rendered by `next/og`.** A route handler returns a 1080x1920 PNG built from JSX.

The deciding argument is dependencies. `docs/lab.md` records that the repo has five
runtime dependencies deliberately, and that any addition has to be argued for at the
point of use. `next/og` ships with Next and adds none. `html2canvas` and friends would
add one to solve a problem the framework already solves.

**Content: the best line, set large, over a compact receipt of stats.** The model
nominates its own strongest line as one extra field in the structured output. The
stats underneath give a viewer a reason to want their own.

Two things fall out of this that are worth knowing before writing it:

- Satori supports flexbox and a subset of CSS. No grid. The card is a separate layout
  from the chat UI, not a reuse of it.
- The bundle cap is 500KB including fonts, and only `ttf`, `otf` and `woff` parse. The
  site's two licensed faces have to be loaded as an `ArrayBuffer` and counted against
  that budget.

Sharing to an Instagram story is the Web Share API: fetch the card, wrap the blob in a
`File`, call `navigator.share`. Desktop falls back to a download.

Note that this needs **no CSP change**. An earlier reading of `lab.md` suggested
generated images were a problem under the current headers. They are not, in this
shape: the card is served from `/api/...`, which is same-origin, so `img-src 'self'`
already covers previewing it in an `<img>`. The trap to avoid is `URL.createObjectURL`
for the preview, because `blob:` is not in `img-src`. Fetch the route directly.

### The landing page

`/lab/roast` opens as a landing page carrying both things a visitor might need: the
Spotify login button, and the waitlist form with the reason for the cap stated plainly.

Both, not one, because **there is no way to know in advance whether a given visitor is
on the allowlist.** That fact is only discovered by sending them to Spotify and seeing
what comes back. A page that offered only the login button would send the majority
into a refusal with no explanation, and a page that offered only the form would gate
the 25 people it was built for.

The chat takes over after a successful callback.

Rejected: opening straight into the chat with the login arriving as a bubble, which is
better in character and would have been the choice without the seat cap. It has
nowhere honest to put the waitlist. Rejected: redirecting to Spotify on load, which is
hostile to anyone who wants to know what they are authorising and worst for the
majority who get refused.

### Voice

Genuinely brutal, and dry rather than loud. The strongest material is specific: naming
the exact track played 340 times beats any general insult, which is also why the
digest is shaped the way it is.

The personality lives in **`src/data/roast.ts`**, following the split the repo already
uses, where sentences live in `src/data/` and identifiers in `src/constants/`. The
system prompt, the tone rules and the templated reading beats are all copy, and a
change of tone should be an edit to one file.

One rule belongs in that prompt from the first draft: the roast is about taste, habits
and pretension, and never infers anything about a person's identity, health or
politics from their music. That is the failure mode of a mean agent pointed at real
people, it is not funny when it lands, and it is cheaper to forbid up front than to
patch after someone screenshots it.

---

## What it reads

| Data | Endpoint | Scope |
| --- | --- | --- |
| Top tracks, last 4 weeks | `/me/top/tracks?time_range=short_term` | `user-top-read` |
| Top artists and their genres | `/me/top/artists` | `user-top-read` |
| Recently played, last 50 | `/me/player/recently-played` | `user-read-recently-played` |
| Liked song count | `/me/tracks?limit=1`, read `total` | `user-library-read` |
| Playlist names and counts | `/me/playlists` | `playlist-read-private` |

Genres are only available hanging off artist objects. There is no genre endpoint, and
`src/server/spotify/mappers.ts` already has `modalGenre` for exactly this shape.

### What Spotify does not give us

**Hours played does not exist in the Web API.** Total listening time is Wrapped's
internal data and is not exposed to third parties. The options are all worse than the
question implies:

- Summing `duration_ms` over the last 50 recently-played tracks is real, but it is
  "hours in your last 50 plays", not lifetime, and presenting it as lifetime would be
  a lie the app does not need.
- The Spotify data export a user can request does contain true `ms_played` history,
  and arrives by email days to weeks later, which kills the one-click flow.
- Estimating it is fabrication.

**Decided: make it a joke.** An agent that says it cannot see how long you have spent
on this, and that this is probably for the best, is funnier than an invented number.

Also unavailable, and worth checking rather than assuming: audio features,
recommendations and related-artists were withdrawn from apps registered after
27 November 2024. A new application for the roast falls on the wrong side of that date,
so "your library is 40% sad" style material is out. Verify against the current
developer docs before designing around it either way.

---

## Files and routes

    src/app/lab/(bare)/roast/
      page.tsx                       landing: login button + waitlist form
      thread.tsx                     the chat, client component
      roast.module.scss              exists, extend rather than replace

    src/app/api/lab/roast/
      login/route.ts                 redirect to Spotify /authorize, set state
      callback/route.ts              exchange, fetch, digest, discard, redirect
      stream/route.ts                digest in, roast out
      card/route.ts                  next/og, 1080x1920 PNG
      seat/route.ts                  waitlist form, via Resend

    src/server/roast/
      userAuth.ts                    the per-visitor OAuth pair, app B only
      digest.ts                      raw Spotify responses -> the digest
      agent.ts                       the Claude call
      beats.ts                       templated reading beats from the digest

    src/data/roast.ts                system prompt, tone, beat copy, landing copy
    src/models/Roast.ts              Digest, RoastBubble, RoastResponse

Naming follows the repo: `const` and arrow functions, `export type`, snake_case model
fields, PascalCase enums with CAPS values, and args objects on anything taking more
than one parameter.

`src/server/roast/userAuth.ts` is deliberately not merged into `src/server/spotify/`.
That folder is the owner-token integration and its whole design assumes one credential
pair held in module scope. Per-visitor auth against a different application shares
none of those assumptions, and the one thing worse than two auth files is one file
that pretends the two cases are the same.

---

## Constraints to check before writing app code

- **Two new environment variables**, `SPOTIFY_ROAST_CLIENT_ID` and
  `SPOTIFY_ROAST_CLIENT_SECRET`, plus a redirect URI registered on app B. A fresh
  worktree has no `.env.local` and will read as offline until one exists.
- **One new runtime dependency**, `@anthropic-ai/sdk`. This is the sixth, and
  `docs/lab.md` asks for it to be argued for at the point of use. The argument: the
  alternative is hand-rolling SSE parsing and retry against a moving API, and the
  repo's own rule is to scope thin wrappers to one job rather than reimplement a
  vendor client. `next/og` covers the image, so the QR-style second dependency the
  lab plan anticipated never arrives.
- **CSP.** `connect-src 'self'` is satisfied because both the stream and the card are
  our own routes. No change to `next.config.ts` is needed. Do not reach for `blob:`
  URLs in the client: they are not in `img-src`.
- **Model.** `claude-opus-5`, adaptive thinking, streaming. The first-token pause is
  real and, uniquely for this app, wanted: it is the one page where a typing indicator
  with nothing behind it is the intended effect rather than a bug.
- **Spotify state parameter.** The OAuth `state` has to be generated, sent and checked
  on the way back. Without a store it lives in a short httpOnly cookie set by the
  login route and cleared by the callback. This is the one cookie the flow needs, and
  it holds a random string rather than anything about the visitor.

---

## Open questions

- Whether to submit for a quota extension. Unchanged from `lab.md`.
- Whether `output_config.format` streams. Spike this first; it decides how much work
  the reading beats have to do.
- Whether the refused visitor's waitlist form should be a section of the landing page
  or its own route. Leaning section, because the refusal lands back on the callback
  and a redirect to an anchor is simpler than a fifth route.
- Whether a second roast in the same session should be possible at all, given nothing
  is stored. The digest is still in the client, so re-rolling costs one API call and
  no Spotify round trip. Cheap, and possibly worse: the second one is rarely funnier.

## Build order

1. **App B and the OAuth round trip.** Login, callback, state check, and a page that
   renders the raw digest as text. No agent, no design. This is the part that can fail
   in ways nothing else can, and everything downstream is a pure function of the
   digest it produces.
2. **The digest and the beats.** Both from the same computed stats, testable against
   fixtures with no Spotify and no Claude in the loop.
3. **The agent.** Prompt, structured output, `src/data/roast.ts`.
4. **The thread.** Bubbles, pacing, the typing indicator finally resolving.
5. **The card and the share.** `next/og`, then `navigator.share`.
6. **The waitlist.** Last, because it reuses the Resend pipeline and the contact
   validation wholesale and is the least likely thing to surprise anyone.

## Status today

Planned. A teaser renders at `/lab/roast`, nothing fetches, nothing is installed, and
the second Spotify application does not exist yet.
