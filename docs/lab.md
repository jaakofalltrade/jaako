# The lab

Everything on this site that is not the portfolio lives under `/lab`. Only `/lab/suggest`
actually works; every other app in the register renders a teaser wearing the design it
will ship in, so the shape of each is visible before any of it does anything.

This document is the agreed plan. It records what was decided, what was rejected and
why, and what is still open. Read it before building any of them.

---

## Why a lab at all

The portfolio answers one question, which is whether you should hire this person. The
apps answer none. They are toys, they are meant to look nothing like a CV, and putting
them at the site root would slowly turn a portfolio into a directory of unrelated
things.

`/lab` gives them one door and one index. Adding another app is a row in
`src/data/lab.ts` and a folder, and no decision has to be re-litigated to do it.

---

## Decisions

Each of these was a fork with real alternatives. The alternative is written down too,
because the reason a thing was rejected is the part that gets lost.

### Routes

Canonical paths are `/lab`, `/lab/slots`, `/lab/suggest`, `/lab/roast`, `/lab/deepcuts`.
The index at `/lab` lists every app with its status, so there is always somewhere to
send a person who has not seen any of them.

Rejected: top-level `/slots`, `/suggest`, `/roast`. Shorter and more shareable, but it
leaves no home for a list of them and it fills the one namespace that future portfolio
pages have to share. Short aliases redirecting into `/lab` were also considered and
dropped as two names per app to keep straight, for a URL nobody types by hand anyway.

### Styling

**Each app owns its CSS as a colocated `*.module.scss` next to the component.** This
is the one place in the repo where a component owns its styles. Everywhere else the
rule still holds: `src/styles/globals.scss` is the whole cascade and components carry
class names into it.

The exception is deliberate. `globals.scss` is an ordered cascade where the order *is*
the specificity strategy, and it works because every partial in it is describing one
coherent design. Three apps that each look like something else would have to be
appended to that list and then fight it, and a mistake in one would be visible in the
portfolio.

CSS Modules give each app a compiler-guaranteed scope instead. The cost is the second
convention, which is what this section exists to explain.

Rejected: a `(lab)` route group with its own second global stylesheet (clean, but the
shared primitives then need a third home both cascades import), and re-declaring the
design tokens under a scope class per app (cheapest, but every app would still be
wearing the portfolio's bones, which is exactly what these are not supposed to do).

**Tokens are declared locally, at the top of each module, on the app's root class.**
An app does not read `src/styles/tokens/*`. If two apps want the same value they may
each declare it; they are not a system and should not be made into one.

### The frame

`PageShell` used to be mounted in the root layout, which meant the ticker footer and
the now-playing dock were on every page there could ever be. It has moved down one
level so a route can opt out.

    src/app/(site)/layout.tsx        PageShell: portfolio, /work, /experience
    src/app/lab/(framed)/layout.tsx  PageShell: /lab and /lab/suggest
    src/app/lab/(bare)/layout.tsx    no shell: /lab/slots, /lab/roast, /lab/deepcuts

Route groups do not appear in the URL, so `/lab/slots` is still `/lab/slots`. The root
layout keeps `<html>`, `<body>`, the fonts, the duotone filter and `globals.scss`,
because every page wants the reset and the type even when it wants nothing else.

Which frame each app gets is data, not a folder convention you have to remember: every
entry in `src/data/lab.ts` carries a `shell` field, and it has to agree with which
group the route is in. Nothing enforces that agreement.

**Bare pages must paint their own ground.** The page background is two fixed
pseudo-elements on `<body>` at `z-index: -2` and `-1` (see `base/_reset.scss`), so a
bare app that wants to be dark covers them with its own fixed ground element rather
than trying to unset theirs.

### Identity

A visitor is an opaque random id in an httpOnly cookie, set on first visit. That is
enough to count three rolls a day and to attribute a song suggestion. No account, no
login, no personal data, and nothing to remember.

It is resettable by clearing cookies or opening a private window. For a slot machine
with no stakes that is fine, and pretending otherwise would mean a login wall on a toy.

The roast is the exception: it needs a real Spotify session, and that is its own
problem, below.

### Storage

Nothing is chosen yet, and nothing needs to be until the first app actually stores
something. The plan is a small server-side store interface with one in-memory
implementation, exactly the shape `src/server/contact/rateLimiter.ts` already has:

    src/server/store/
      index.ts        the interface: get, set, increment, with a ttl
      memoryStore.ts  today. A Map. Correct locally, wrong on serverless.
      redisStore.ts   later, if and when. One file, one swap.

**The known catch:** module memory does not survive between serverless invocations, so
an in-memory daily counter is not a real limit in production. The contact form's rate
limiter has this same hole today. Whichever app ships first is the one that has to
close it, and Redis with a per-key TTL is the expected answer because every counter
here is a key with an expiry.

### Discovery

`lab` is a fifth item in `NAV_ITEMS`, so it appears in the inline jump menu above the
about section and in the footer list that renders on every page.

It is the only item in that list that is a route rather than an on-page fragment.
`SectionNav` used to build every href as `#${id}`, which would have sent the homepage
menu to a section that does not exist. It now prefers `item.route` when there is one.

---

## The apps

### `/lab/slots` : slot machine

Three pulls a day, and a win prints something you can actually claim.

**Design: arcade CRT.** Near-black ground, scanlines, magenta and cyan, LED-segment
type, bloom on a win.

> This knowingly breaks the site's standing no-glow rule. That rule is about the
> portfolio's frosted palette and it still holds everywhere else. The exception is
> scoped to this app's module and is not a precedent for the other two.

**The prize.** There is no score, no leaderboard and no currency. A winning pull
prints a voucher: a QR code and the same string in human-readable form underneath,
which the visitor mails to jaako to claim whatever it is worth that week.

The code is self-verifying, so claiming needs no database:

    JK-7F3A-K92
           ^^^ hmac(date + tier, LAB_PRIZE_SECRET)

Verification is recomputing the tail and comparing. A forged code fails immediately.
A genuine code is reusable unless redemptions are tracked somewhere, which is a
deliberate accepted risk while the prize is a personal favour rather than a thing of
value. If that changes, redemptions are the first thing that needs the store.

Open: what the prize actually is, and the win odds. Both are copy and a constant.

### `/lab/suggest` : song suggestions

A visitor searches Spotify, picks a track, and it appears on a public playlist.

**Design: the portfolio's.** This is the one app that does not get its own look. It is
about music the site already talks about, it sits next to the now-playing dock, and
making it strange would be strange.

**Adding is instant, with guards rather than a gate.** A moderation queue was
considered and rejected: it makes the page dead on arrival for the visitor, who then
has no reason to come back and check.

    max 2 adds per visitor per day     (cookie id, store)
    reject if already on the playlist  (read the playlist first)
    owner view: remove on every row    (fast undo instead of a slow gate)

**Scope.** This needs `playlist-modify-public` added to the stored refresh token,
which the current token does not carry. Adding it is a re-authorisation of the owner
account, not a code change. The site's token then has write access to one playlist,
which is worth being deliberate about.

Optional and unresolved: a display name on each row. Fun, and unverified free text,
which means it inherits the same validation `src/utils/contactRules.ts` already does
for the contact form. Not built until asked for.

### `/lab/roast` : judgerist

An agent reads a person's listening data and is unkind about it.

> Superseded in detail by `docs/roast.md`, which is the agreed plan for this one app.
> The section below is the original sketch and is kept for the reasoning behind the
> design. Where the two disagree, `roast.md` wins: notably, the token store it
> describes below turned out to be avoidable, and the roast gets its own Spotify
> application rather than sharing the site's.

**Design: a messaging app.** Bubbles, a typing indicator between lines, timestamps.
The roast is streamed, so the pauses are real and read as timing rather than as
loading. It is also the most screenshot-friendly form, which is the only way a thing
like this travels.

**Wiring.** A route handler calls the Claude Messages API with the visitor's top
artists, tracks and genres in the prompt, and streams tokens back to the page. This
adds `@anthropic-ai/sdk` and an API key, and costs a fraction of a cent per roast.
Streaming from our own `/api` route satisfies the existing `connect-src 'self'` CSP
with no change to `next.config.ts`.

**The constraint that shapes this app.** Reading a visitor's own top items requires
them to authorise our Spotify app, and an app that has not been through Spotify's
quota-extension review is limited to 25 accounts, each added by hand in the developer
dashboard. Everyone else gets an authorisation error.

That is accepted rather than avoided. The alternative was roasting the owner's data
for everybody, which works for any number of visitors and is a different, lesser joke.

**So the 26th visitor is a designed state, not an error.** They get an honest
explanation and a form asking for one of the seats, which reuses the Resend pipeline
and the validation behind the contact form. A limit presented as an invite list is
better than a limit presented as a failure.

Open: whether to submit for a quota extension at all. Personal projects are often
declined, and being declined costs nothing but time.

### `/lab/deepcuts` : deepcuts

A pack of cards is dealt out of one of my playlists, and how rare each card is depends
on how few plays the track has.

**Design: a trading card pack rip.** Panini or Pokemon rather than Valve. Light ground,
warm paper, cards fanning out from behind a foil wrapper, and foil treatments on the
two rarest rungs.

> Deliberately not a CS-GO crate. The mechanic is borrowed from one, and the look is
> not: a dark blue-grey crate with a glowing Covert drop would be a second dark, glowing
> app sitting next to the slot cabinet, and the no-glow exception in this document is
> scoped to slots alone. The rare rungs are foils instead, which means a gradient inside
> the shape's own bounds rather than light thrown off it. `deepcuts.module.scss` says
> so at the top, because it is the rule most likely to be broken by the next person
> adding a tier.

**Rarity runs backwards, and that is the app.** The fewest plays wins. A chart hit is
the common you throw back and a track with a few thousand plays is the pull.

Rejected: the literal CS reading, where the most-played track is the rarest. It is more
immediately legible to anyone who has opened a case, and it makes the prize the most
generic thing on the playlist, which is the opposite of a personal playlist's point.
Inverting it costs one sentence of explanation on the page and buys the entire joke.

The ladder is `DeepcutTier` in `src/models/Lab.ts`, commonest first, with its labels in
`src/constants/lab.ts` next to `LAB_STATUS_BADGE`:

    chart      everyone has heard it
    rotation   a song that had its year
    album cut  never a single
    deep cut   thin numbers
    unheard    almost nobody has played this

**Spotify cannot supply the number this app is scored on.** This is the constraint that
shapes everything else, and it is worth stating plainly because the app sounds like it
should be pure Spotify:

- The Web API has never exposed play counts. Not per track, not per playlist, not for
  the owner's own library.
- The closest field is `popularity`, an integer 0 to 100 that Spotify describes as
  based "in the most part, on the total number of plays the track has had and how
  recent those plays are". It arrives free: `GET /v1/playlists/{id}/tracks` returns
  **full** track objects, so one request gets the playlist and a number for every
  track on it with no per-track fan-out.
- **`popularity` is marked deprecated in Spotify's own reference.** It still returns
  values today. Given that audio features, audio analysis, recommendations and related
  artists are already permanently unavailable to this app, building the entire scoring
  mechanic on a field Spotify has flagged for removal is a bet this app should not
  take.

**So the counts come from Last.fm.** `track.getInfo` returns a global `playcount` and a
`listeners` figure. Free API key, no OAuth, server-side only, and it is a real integer
a card can print rather than a normalised score.

The costs are accepted rather than solved:

- **Matching is fuzzy.** Spotify gives an artist and a title; Last.fm is asked for the
  same pair and may return a different recording, a live version, or nothing. A track
  that cannot be matched has no tier, and the honest answer is to leave it out of the
  pack rather than guess a rung for it.
- **Scrobbles are not streams.** Last.fm counts what its own users scrobbled. It is a
  decent proxy for how much of the world has heard a song and it is not Spotify's play
  count. `DEEPCUTS_TEASER.source_note` already says this out loud on the page, because
  a visitor who works it out on their own concludes the numbers are invented.
- **It is a second upstream.** The playlist read stays on Spotify; only the counts come
  from Last.fm. If Last.fm is unreachable the pack cannot be scored, which is a whole
  outage rather than a degraded one.

Rejected: Deezer's `rank`, which is another normalised index with the same objection as
`popularity` and no advantage over it. Songstats, Chartmetric and Soundcharts have real
Spotify stream figures and all of them are paid, which is a subscription for a toy.
MusicBrainz, Genius and Musixmatch carry no play data at all.

**Counts are cached, not fetched per pack.** A playlist changes slowly and a global
play count changes slower. The intended shape is one scored snapshot of the playlist,
refreshed on a schedule, with packs dealt out of the snapshot: a pack rip should be one
read, not a fan-out of Last.fm calls while a visitor waits on an animation. That makes
this the second app after `/lab/suggest` to want the store, and unlike the slot
machine's counter it wants a value with a long TTL rather than a daily one.

Open, and none of it blocking:

- **The thresholds.** Which play counts separate the rungs. Deliberately not modelled:
  they are tuning constants, they will move the first time real numbers are seen, and
  the teaser says `thresholds: undecided` rather than inventing five bands.
- **Which playlist.** The teaser says "a playlist of mine" on purpose. Pointing it at
  the `/lab/suggest` playlist is tempting and is a real design decision, not a wiring
  detail: it would mean visitors are dealt cards out of a list other visitors filled,
  which is a different app from being dealt cards out of mine.
- **Whether a pull persists.** Cards that survive between visits need the store and an
  identity; cards that do not are a rip and a screenshot. The cookie identity described
  above is enough for either.

---

## Constraints to check before writing app code

- **Spotify scopes.** Today's token has `user-read-currently-playing`,
  `user-read-recently-played` and `user-top-read`. Suggestions need
  `playlist-modify-public` on the owner token. The roast needs a per-visitor OAuth
  flow, which is a second token store and a callback route, not an extra scope.
- **CSP.** `connect-src 'self'` allows our own streamed routes and nothing else, so
  any browser call must go through `/api`. `img-src` allows `i.scdn.co` only, which
  covers album art and would not cover an avatar from anywhere else.
- **Downloads are not free.** A generated voucher image cannot be handed over with a
  plain `<a download>` under the current headers. The QR is rendered inline as SVG and
  the fallback is that the visitor screenshots it or types the code.
- **Play counts are not Spotify's to give.** Nothing in the Web API returns one, and
  `popularity` is a normalised score that Spotify has now marked deprecated. Any lab
  app that wants a real number needs a second upstream; deepcuts uses Last.fm.
- **A second upstream is a second key and a second CSP question.** `LASTFM_API_KEY`
  belongs in `serverConfig` beside the Spotify credentials, and the call is made
  server-side. `connect-src 'self'` means the browser must never reach Last.fm
  directly, so this goes through `/api` like everything else.
- **No new runtime dependency has been added.** The repo's dependency list is short
  deliberately. QR generation and the Claude SDK are the two that this plan eventually
  forces, and both should be argued for at the point of use. Last.fm is not one of
  them: it is a JSON endpoint reached with `fetch`, the same way the Spotify client
  already works.

---

## Build order

1. `/lab/suggest`, because it needs no agent, no prize, and no per-visitor OAuth. It
   is the one that proves the store interface and the cookie identity.
2. `/lab/slots`, once the store is real. Cabinet first, prize code second.
3. `/lab/deepcuts`, which needs the store for a cached snapshot rather than a counter,
   and needs no OAuth of its own: the playlist read is the owner's token and the play
   counts are an unauthenticated key. The scoring pass can be written and checked
   against real numbers long before any of the pack rip is built.
4. `/lab/roast`, last, because it is the only one whose audience is capped by Spotify
   rather than by us.

## Status today

`/lab/suggest` works. `/lab/slots` and `/lab/roast` are teasers: a static render of what
the app will look like with its controls inert, storing nothing and fetching nothing.

`/lab/deepcuts` is in between, which is what `building` on the index means. The pack
opens, the fan spreads, the cards turn over worst to best and each one is graded on a
rung — and every track on them comes out of a fixture in `src/data/deepcuts.ts`. No
playlist has been read and no play count has been looked up. The page says so above the
pack rather than in a footnote, because a visitor who works that out unaided concludes
the whole app is a mock-up rather than just the numbers.

What is left is the part that has nothing to do with the design: read the playlist,
match each track on last.fm, cache the scored snapshot, and deal out of it. The shapes
are not waiting on any of that, which was the point of building them first.
