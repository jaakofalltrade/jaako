# Notion as the blog's CMS

A research and design study, not an implementation. Nothing in the repo reads Notion
yet. This is the document to argue with before any of it gets built.

Researched against Notion API `2026-03-11`, `@notionhq/client@5.26.0`, Next `16.3.1`
(the version in this repo) and Vercel's Hobby limits, in August 2026. Every number
below is cited at the foot of the file. Where I could not verify something, it says so
rather than guessing.

---

## The short version

**Notion works, and the blog is not the hard part. The images are.**

Everything else — querying posts, filtering drafts, walking blocks, rendering them —
is ordinary work that behaves the way you would expect. One thing does not:

> Notion-hosted file URLs are S3 presigned links that expire after **one hour**, and
> the API documentation says outright: *"Don't cache or statically reference these
> URLs. To refresh access, re-fetch the file object."*

A portfolio that builds statically and bakes those URLs into HTML has working images
for one hour after each deploy and broken ones forever after. That single sentence is
the reason this document is long, the reason there is an architecture decision to make
at all, and the reason most "Notion as a CMS in 20 minutes" posts are wrong.

**Recommendation: mirror the images into the repo at build time and trigger a redeploy
when you publish.** Rationale in [Decision 1](#decision-1-how-images-get-to-the-browser).

The honest alternative first, though, because it deserves one paragraph and not a
footnote: **MDX files in this repo would be strictly simpler.** No API, no token, no
image pipeline, no rate limit, no vendor version churn, and the post history lands in
git next to the code. The entire cost of Notion is the image pipeline described below.
You are buying a nicer writing surface, on your phone, with a real editor, and that is
a legitimate thing to buy. Just buy it knowingly. If you would rather write in an
editor than in Notion, stop reading and use MDX.

---

## 1. What the API actually looks like in 2026

The Notion API has broken twice in seven months. Both breaks matter here, and the
lesson at the end of the section matters more than either.

### 1.1 Databases became data sources (`2025-09-03`)

A database used to hold pages. Now a **database is a container holding one or more
data sources**, and the data source is what holds the pages. The query endpoint moved:

```
POST /v1/databases/{id}/query      <- gone
POST /v1/data_sources/{id}/query   <- current
```

The practical trap: **the ID in your Notion URL is the database ID, and it is not the
ID you query with.** You retrieve the database once, read `data_sources[0].id` off it,
and that is the value you keep. Give it its own environment variable rather than
resolving it on every build; it never changes, and a lookup on every cold start is one
more request against a 3-per-second budget for a value that is a constant.

### 1.2 `archived` became `in_trash` (`2026-03-11`)

The current version renames `archived` to `in_trash` across pages, blocks, databases
and data sources, in both request bodies and responses, and reworks the
append-block-children endpoint to take a `position` object instead of a flat `after`
string. Appending is a write, so this blog never touches it. The rename does show up
in read responses.

### 1.3 The lesson: pin the version, do not float it

Two breaking versions in seven months is the actual finding. Notion versions the API
by a date header, not by SDK version, and the SDK's default version will move under
you when you take a routine dependency bump.

**Send `Notion-Version: 2026-03-11` explicitly on every request, from a constant.**
Then a version change is a deliberate edit to one line in `src/server/notion/`, and
`pnpm update` cannot silently repoint the site at a schema it has never seen. This is
the same reasoning already written into `next.config.ts` about the Spotify image hosts:
verify against the real thing rather than assume, and hold the assumption in one place
where it can be reread.

### 1.4 The Markdown endpoint — the one open question

Since roughly February 2026 there is:

```
GET /v1/pages/{page_id}/markdown
```

It returns the whole page as "enhanced Markdown" — Markdown plus XML-ish tags for the
Notion-only constructs like callouts and columns — with a `truncated` flag and an
`unknown_block_ids` array for pages over ~20,000 blocks. If it works for us it deletes
the entire recursive block walk in [section 2](#2-reading-a-post) and replaces it with
one request per post.

**I could not confirm it is available to this site.** Secondary sources state the GET
endpoint is restricted to *public* integrations, and that internal workspace bots —
which is what a personal portfolio uses — must still use the block API. The official
reference page does not mention that restriction either way. One of the two is stale
and I cannot tell which from the documentation.

**This is the highest-leverage unknown in the document and it costs twenty minutes to
settle.** Before designing anything, create the integration and run:

```sh
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2026-03-11" \
  "https://api.notion.com/v1/pages/$A_REAL_PAGE_ID/markdown"
```

A `200` changes the design. A `400` or `403` means the block walk stands. Everything
else in this document holds either way — the renderer changes, the plumbing does not.

My advice regardless of the answer: **the block walk is the safer default.** Markdown
means adopting a Markdown pipeline (remark/rehype, plus a sanitiser) and then writing
custom handling for Notion's XML-ish extensions on top of it, which is a lot of
dependency for a page that renders maybe nine block types. Walking blocks yields React
elements directly, with no HTML string ever constructed and so nothing to sanitise.
That is both less code and a smaller attack surface, and it matches how this repo
already treats third-party data.

---

## 2. Reading a post

### 2.1 The shape of the work

Notion splits a post across two calls that behave differently:

| | Endpoint | Gives you |
|---|---|---|
| **Properties** | `POST /v1/data_sources/{id}/query` | Title, slug, date, tags, status — every post, 100 at a time |
| **Content** | `GET /v1/blocks/{id}/children` | The body, **one level deep**, 100 blocks at a time |

The index page needs only the first. The post page needs both.

### 2.2 Blocks are a tree and the API hands you one layer

`GET /v1/blocks/{id}/children` returns the first level only. A block that contains
other blocks — a toggle, a bulleted list with sub-items, a callout with a paragraph
inside, a column layout — comes back with `has_children: true` and no children
attached. You recurse on that flag, and you paginate each level at 100 with
`start_cursor` / `has_more`.

So the request count for one post is:

```
1  (query, shared across all posts)
+  ceil(top_level_blocks / 100)
+  one request per container block that has children
+  ... recursively
```

A 40-block post with five toggles and a two-column layout is about **7 requests**. Not
one. This is the number people miss when they estimate build times.

### 2.3 The rate limit is a build-time budget

Three requests per second on average per integration, bursts tolerated, `429` with a
`Retry-After` header in whole seconds when you exceed it. There is also a
per-workspace limit that scales with plan, which on free is the tighter of the two but
is not documented as a number.

At portfolio scale this is fine, but it is not free:

| Posts | ≈ Requests | Serial at 3/s |
|---|---|---|
| 10 | ~70 | ~23s |
| 20 | ~140 | ~47s |
| 50 | ~350 | ~2m |

That is added to every production build. Two things keep it small, and both are worth
doing from the start rather than when it hurts:

- **Never fetch bodies for the index.** The query returns every property you need for
  a list row. Only `[slug]` pages fetch blocks.
- **Bound the concurrency at three.** `generateStaticParams` will happily fan out
  every post at once and earn a wall of `429`s. A small semaphore, or a chunked loop,
  is the whole fix.

And handle `429` properly: honour `Retry-After`, retry once, and let a second failure
throw. The reasoning is already written down in `spotifyApiClient.ts` — one retry, not
a loop, because a loop turns a broken deployment into a rate-limited one. The same
sentence applies here.

### 2.4 Limits that will not bite, recorded so nobody re-derives them

- 100 blocks per response, 100 relations, 100 multi-select options.
- 2,000 characters per rich text object. A long paragraph in Notion is split across
  several rich text objects, so this is not a paragraph length limit, but a mapper
  that reads `rich_text[0]` and stops is quietly wrong on long text. Read the array.
- 10,000 results per data source query, then `has_more` goes false and
  `request_status.type` is `incomplete`. Irrelevant below ~10,000 posts.
- 1,000 block elements and 500KB per **request body** — a write limit. Never hit here.

---

## 3. The free plan

Free is genuinely sufficient. The three things worth knowing:

- **The 1,000-block cap does not apply to you.** It exists for workspaces with two or
  more members. A solo free workspace has no block limit. If you ever invite someone
  to the workspace, the cap arrives and the blog is what fills it.
- **5MB per file upload.** Fine for images, fatal for video. Host video elsewhere and
  embed it.
- **7-day page history.** Your post's revision history is a week deep and then gone.
  Worth noting because it is the one place Notion is meaningfully *worse* than MDX in
  git, and it is an argument for the build-time mirror in Decision 1: mirrored content
  committed to the repo gives you the version history Notion's free plan will not.

API access, integrations and webhooks are all included on free. Nothing in this design
requires a paid plan.

---

## Decision 1: how images get to the browser

The one real decision. Everything else follows from it.

Four options, with the two that survive marked.

### A. Never use Notion-hosted images

Host images anywhere public — this repo's `/public`, or a CDN — and embed them in
Notion by URL. Notion stores those as `external` files and **`external` URLs are
returned verbatim and never expire.** The entire problem disappears.

Zero infrastructure, and genuinely the right answer if you post images rarely. It just
means the writing flow is "upload the image somewhere, paste the URL", which is most
of what you were trying to escape by using Notion.

### B. Proxy every image through this site ✅ *viable*

A route handler — `/api/blog/image?block=<block_id>` — re-fetches the block on demand,
reads the fresh URL off it, streams the bytes back, and caches the response. The HTML
holds your own stable URL; the expiring URL never leaves the server.

- Images cannot break, because the URL in the page never expires.
- **The CSP does not change.** `img-src 'self'` already covers it.
- Costs a function invocation per image per cache miss, and you write the caching.
- Works with on-demand revalidation, because there is no build step to miss.

### C. Mirror the images at build time ✅ *recommended*

A build step walks the posts, downloads every Notion-hosted image into `/public/blog/`
under a content-hashed name, and rewrites each block's URL to the local path before
the page is rendered. Images become ordinary static assets.

- The rendered site has **no runtime dependency on Notion at all.** Notion down means
  a stale blog, not a broken one.
- The CSP does not change. `'self'` covers it.
- Stable filenames, so `next/image` optimises each image exactly once, ever.
- Committing the mirrored files gives you the image history the free plan's 7-day
  window does not.
- The cost: **publishing requires a redeploy.** Fixing a typo takes about a minute
  rather than being instant.

### D. Render the blog dynamically

Never cache, fetch on every request, URLs are always fresh. Correct, and it throws away
static rendering for a page that changes twice a month. Every visitor pays a Notion
round trip. No.

### Why C

Three reasons, in order of weight.

**1. It is the only option where the site does not depend on Notion at runtime.** This
repo already has a considered position on third-party failure: the Spotify panel
degrades to an "offline" state, the contact form refuses out loud with a 503, the
suggestion list renders without names. Those are all *live* features, where degrading
is the only option. A blog post is not live. It was written last Tuesday and it has not
changed since. Making a visitor's page load depend on an API call for content that was
final a week ago buys nothing and adds a failure mode.

**2. The Vercel Hobby image quota interacts badly with rotating URLs — this is a real
cost, not a theoretical one.** Hobby includes 5,000 transformations and roughly 1,000
**source images** per month. `next/image` keys its optimiser cache on the source URL.
A Notion presigned URL carries `X-Amz-Signature` in the query string and **changes
every single time you fetch the block** — so under option B every revalidation
presents each image as a brand new source image. Ten images revalidating hourly is
7,200 source images a month against a cap of 1,000, and past the cap images stop
optimising and return a 402. Under option C the same ten images are ten source images,
permanently. The difference is three orders of magnitude.

(If you go with B anyway, this is survivable: set `unoptimized` on Notion images, or
proxy with a stable cache key. But you have to know to do it.)

**3. It keeps the CSP honest.** Notion serves files from
`prod-files-secure.s3.us-west-2.amazonaws.com`. Adding that exact host is narrow and
fine. What you must not do is reach for `https://*.amazonaws.com`, which allows every
S3 bucket on earth to serve images into your pages. Mirroring sidesteps the question:
the files are same-origin and `img-src 'self'` already permits them, so
`next.config.ts` is not touched at all. The comment block in that file explains each
directive because the CSP is the part that breaks pages without the type checker
noticing. The best change to it is none.

**Pick B instead if** instant publishing matters more to you than the above — if you
expect to fix typos from your phone and want them live in seconds. It is a legitimate
trade and B is a good design. It is not the one that fits this repo.

---

## Decision 2: when the site rebuilds

This decision is **forced by Decision 1**, and mixing the two combinations is the
subtle way to build something broken.

Notion has real webhooks: you subscribe an endpoint, Notion posts a one-time
`verification_token` to it, you paste that token back into the integration UI to
activate, and **that same token becomes the HMAC-SHA256 signing secret** for every
delivery thereafter, arriving as `X-Notion-Signature: sha256=<hex>`. Notion does not
let you retrieve the token later — lose it and you delete the subscription and make a
new one. `page.content_updated` is an *aggregated* event: batched, and delivered within
about a minute rather than instantly.

The two coherent combinations:

| | Images | Rebuild trigger | Publishing feels like |
|---|---|---|---|
| **Static** ✅ | Mirrored at build (C) | Webhook → Vercel **Deploy Hook** | ~1 minute, whole site rebuilt |
| **ISR** | Proxied at runtime (B) | Webhook → `revalidateTag` | ~seconds, one page |

**The trap:** taking the mirror from C and the `revalidateTag` from B. `revalidateTag`
re-runs the page render, not the build. The mirror script never runs, so a newly added
image has no local file, and the post renders with a dead `/public/blog/...` path.
It fails only for *new* images in *edited* posts, which is exactly the kind of fault
that survives testing and appears three months later.

With the static combination the webhook handler is small: verify the HMAC, then POST to
a Vercel Deploy Hook URL. It does not need `revalidateTag` at all.

**Note that this repo is on Next's previous caching model.** `cacheComponents` is not
set in `next.config.ts`, so `use cache`, `cacheLife` and `cacheTag` do not apply —
the tools are `export const revalidate`, `fetch(..., { next: { tags, revalidate } })`
and `unstable_cache`. Also worth knowing before writing any fetch: in Next 16 **`fetch`
is not cached by default**, so a Notion call caches only if it explicitly says
`cache: 'force-cache'` or sets a `revalidate`. Under the recommended static design
this barely matters — the data is fetched at build — but it is the kind of default
that makes a "why is this fetching on every request" afternoon.

A plain `export const revalidate = 3600` with no webhook at all is a perfectly
respectable starting point. Webhooks are an optimisation for impatience; add them
second.

---

## 4. How it would sit in this repo

Deliberately shaped like what is already here. The Spotify integration is the precedent
in every respect: it is a third-party read API, behind a server-only client, with pure
mappers, its own model namespace and its own setup doc.

### 4.1 No SDK

`@notionhq/client@5.26.0` exists and is fine. I would still not use it, for the same
reason `spotifyApiClient.ts` exists instead of a Spotify SDK: the client this needs is
about sixty lines — bind the token, set the version header, GET JSON, retry a `429`
once honouring `Retry-After` — and the SDK's value is mostly types that you cannot
believe anyway.

That last point is not rhetorical, and `models/Spotify.ts` already says it out loud:
the response types declare almost every field optional because *the cast is a cast* and
nothing validates the bytes. Notion's block schema is far larger and more optional than
Spotify's. An SDK type saying `RichTextItemResponse` does not make the field present at
runtime, and the mapper still has to check. So the SDK buys confidence rather than
safety, and it costs a dependency whose default API version moves on upgrade — the
exact thing [1.3](#13-the-lesson-pin-the-version-do-not-float-it) says to prevent.

This also lines up with the standing preference in this codebase for thin, single-job
wrappers scoped to one purpose, and for counting the conditions before reaching for a
library.

### 4.2 Files

```
src/models/Blog.ts                     Post, PostSummary, PostStatus, and a Notion
                                       namespace for upstream shapes — the same
                                       split as models/Spotify.ts
src/server/notion/notionApiClient.ts   token bound at construction, version header,
                                       429 retry
src/server/notion/blocks.ts            recursive children fetch, bounded concurrency
src/server/notion/mappers.ts           pure. Notion's shapes in, ours out
src/server/notion/posts.ts             listPosts / getPost
src/server/endpoints.ts                add Notion's paths — the file says
                                       "anything else this server ever calls out to
                                       belongs here too"
src/client/endpoints.ts                routes.blog, routes.post({ slug })
src/app/(site)/blog/page.tsx           the index, mirroring work/page.tsx
src/app/(site)/blog/[slug]/page.tsx    one post, mirroring work/[slug]/page.tsx
src/app/api/blog/revalidate/route.ts   webhook receiver (only if Decision 2 says so)
src/design-system/blog/                block renderer components
src/styles/sections/_blog.scss         registered in globals.scss, in cascade order
scripts/mirror-notion-images.mjs       the build-time mirror
tests/server/notion/mappers.test.ts    pure mapper tests, like the Spotify ones
docs/notion-setup.md                   the companion setup doc
```

### 4.3 The Notion database

| Property | Type | Notes |
|---|---|---|
| `Title` | Title | |
| `Slug` | Rich text | **A real property, never derived from the title** |
| `Status` | Status | Filter on `Published` |
| `Published` | Date | Also filtered `on_or_before` today, so future-dating works |
| `Summary` | Rich text | The index row and the meta description |
| `Tags` | Multi-select | |
| `Cover` | Files | Optional, like `Project.plate` |

The slug row is the one to be firm about. `Project.slug` is a stored field and
`client/endpoints.ts` says so explicitly — *"`slug` comes from the Project, never from
a title"*. The same reason applies harder here: retitling a post in Notion would
silently change its URL and break every link to it. A separate property means the URL
is a thing you chose once.

Free Notion has no scheduled publishing, so `Published <= today` in the query filter is
what makes future-dating actually work. Write the post, set tomorrow's date, set the
status, and it appears on the first build after midnight.

### 4.4 Security

Two notes, both short.

**Scope the token by sharing, and share exactly one page.** A Notion internal
integration token can reach only what has been explicitly shared with it. Share the
blog database and nothing else, and the token is genuinely read-limited to the blog.
This is worth calling out because it is *better* than the Spotify situation documented
in `.env.example`, where scopes are granted per application and the read token is not
actually read-only. Here the platform lets you do the right thing. Do it.

**Render blocks to elements, never to an HTML string.** Walking blocks into React
means there is no `dangerouslySetInnerHTML` and nothing to sanitise. And host-check any
URL that reaches an `href` or an `img src`, exactly as `spotify/mappers.ts` does — you
control the Notion content, so this is discipline rather than defence, but it is the
discipline already in the codebase and the cost is one helper that already exists in
`utils/url.ts`.

### 4.5 Environment

```sh
NOTION_TOKEN=              # internal integration secret
NOTION_BLOG_DATABASE_ID=   # from the Notion URL
NOTION_BLOG_DATA_SOURCE_ID=# from GET /v1/databases/{id} — NOT the URL id
NOTION_WEBHOOK_SECRET=     # the verification_token, if using webhooks
VERCEL_DEPLOY_HOOK_URL=    # if using webhooks
```

Read once in `serverConfig.ts` alongside the rest. Absent, the blog should do what
everything else here does when its credential is missing: degrade honestly. An index
that renders empty with a line saying the blog is not wired up beats a 500, and beats
a build that fails on a fresh clone — a fresh worktree has no `.env.local`, and the
Spotify panel already reads "offline" there rather than exploding.

---

## 5. What this costs

Assuming Decision 1C and 2-static, and that the Markdown endpoint question comes back
"block walk":

| | |
|---|---|
| Client, models, mappers | half a day |
| Recursive block fetch with concurrency and `429` handling | half a day |
| Renderer for ~9 block types, styled to match the site | 1–2 days |
| Image mirror script + build wiring | half a day |
| Index and post pages, metadata, tests | half a day |
| Webhook receiver + deploy hook | 2 hours, and optional |
| **Total** | **≈ 3–4 days** |

The renderer is the long pole and it is the part that is purely your taste rather than
Notion's constraints. Nine block types covers paragraph, headings 1–3, bulleted and
numbered lists, code, quote, image and divider — which is a complete blog. Callouts,
toggles, columns, tables, equations, embeds and bookmarks each cost an hour or two more
whenever you first need one, and the right move is to render an unknown block type as
nothing in production and a loud placeholder in development, so an unsupported block
never breaks a page and never ships silently either.

### Risks worth naming

- **The API breaks about twice a year.** Pinning the version means it breaks on your
  schedule instead of Notion's. Budget an afternoon annually.
- **`react-notion-x` is not on the table.** It renders Notion pages beautifully and it
  does so by using Notion's *private* API — the one the app itself uses. It is not
  covered by the developer terms and it can break without notice or deprecation.
  Wrong trade for a site you want to leave alone for six months.
- **Notion is not a CMS and does not pretend to be.** No preview environments, no
  referential integrity, no publishing workflow beyond a property you set by hand. The
  `Status` field is honour-system: nothing stops you saving a half-written post as
  Published.
- **Vercel Hobby is non-commercial personal use only.** A portfolio is fine. If the
  site ever sells anything, that is a Pro plan at $20/mo, independently of Notion.

---

## 6. If you build it, in this order

1. **Settle the Markdown endpoint question** with the curl in [1.4](#14-the-markdown-endpoint--the-one-open-question). Twenty minutes, and it decides the renderer.
2. Create the integration, share **only** the blog database with it, and record the data source ID from `GET /v1/databases/{id}`.
3. Client, models and mappers, with tests on the mappers. Pure functions, no network — the same shape as `tests/server/spotify/mappers.test.ts`.
4. The index page. It needs only the query, so it is the smallest end-to-end slice that proves the whole path works.
5. The block walk and the renderer. Longest step.
6. The image mirror. **Do not skip to step 7 before this works** — everything looks fine for the first hour without it, which is precisely the trap.
7. Webhook and deploy hook, if plain time-based revalidation turns out to annoy you. It might not.

Steps 1–4 are about a day and will tell you whether you enjoy writing in Notion enough
to finish. That is the real question this document cannot answer.

---

## Sources

Notion:

- [Request limits](https://developers.notion.com/reference/request-limits) — 3 req/s, size caps
- [File object](https://developers.notion.com/reference/file-object) — the 1-hour expiry and the caching warning
- [Query a data source](https://developers.notion.com/reference/query-a-data-source)
- [Retrieve block children](https://developers.notion.com/reference/get-block-children)
- [Retrieve a page as markdown](https://developers.notion.com/reference/retrieve-page-markdown)
- [Webhooks](https://developers.notion.com/reference/webhooks)
- [Upgrade guide 2025-09-03](https://developers.notion.com/docs/upgrade-guide-2025-09-03) and [FAQs](https://developers.notion.com/docs/upgrade-faqs-2025-09-03)
- [Changelog](https://developers.notion.com/page/changelog) — `2026-03-11`, Markdown API
- [Pricing](https://www.notion.com/pricing)

Free plan limits: [usecarly](https://www.usecarly.com/blog/notion-free-plan-limits/),
[smartprocessflow](https://smartprocessflow.com/notion-free-plan-limits),
[costbench](https://costbench.com/software/project-management/notion/free-plan/)

Expiring images in practice: [Dan Vega](https://www.danvega.dev/blog/notion-api-file-expired),
[snugl](https://snugl.dev/archive/fixing-notions-1-hour-expiring-image-problem),
[Guillermo de la Puente](https://guillermodlpa.com/blog/how-to-render-images-from-the-notion-api-with-next-js-image-optimization),
[Alex MacArthur](https://macarthur.me/posts/serving-notion-presigned-images-with-cloudflare/)

Webhook signing: [Hookdeck](https://hookdeck.com/webhooks/platforms/how-to-secure-and-verify-notion-webhooks-with-hookdeck)

Vercel: [Hobby plan](https://vercel.com/docs/plans/hobby),
[Image Optimization limits and pricing](https://vercel.com/docs/image-optimization/limits-and-pricing)

Next 16.3.1: the local docs under `node_modules/next/dist/docs/` —
`01-app/02-guides/caching-without-cache-components.md` for the previous caching model
and the uncached-`fetch` default, `01-app/03-api-reference/02-components/image.md` for
`remotePatterns`.
