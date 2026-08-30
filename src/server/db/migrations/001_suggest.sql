-- The song suggestion app. See docs/neon-setup.md, and the plan in docs/lab.md.
--
-- Two tables, and neither of them decides what is on the playlist. The playlist
-- itself is the source of truth: the page is built by reading it from Spotify and
-- joining these rows on, so a row here can annotate a track and can never conjure
-- one. Removing a track in the Spotify app removes it from the page with no code
-- involved, and the orphaned row below becomes invisible rather than wrong.

-- Who suggested what.
--
-- No unique constraint on track_uri, deliberately. The duplicate check asks the
-- playlist, because the playlist is what a duplicate would be a duplicate OF. A
-- constraint here would also refuse a track that was removed and later suggested
-- again by somebody else, which is a perfectly reasonable thing to happen.
create table if not exists suggestion (
  id          bigserial     primary key,
  track_uri   text          not null,
  name        text          not null,
  visitor_id  uuid          not null,
  added_at    timestamptz   not null default now()
);

-- The page joins up to 100 uris on every load. This is that join.
create index if not exists suggestion_track_uri_idx on suggestion (track_uri);

-- The daily allowance: one row per visitor per day.
--
-- Postgres has no per-row ttl, so the expiry Redis would have given for free is a
-- `day` column instead. Nothing sweeps these and nothing needs to: three rows per
-- visitor per day is small enough to leave alone for years, and a sweep can be
-- written the day that stops being true.
--
-- The composite primary key is load-bearing rather than tidy. It is what the
-- conditional upsert in server/suggest/store.ts conflicts against, and that upsert
-- is the whole reason the cap cannot be beaten by two requests arriving together.
create table if not exists visitor_day (
  visitor_id  uuid          not null,
  day         date          not null,
  adds        smallint      not null default 0,
  primary key (visitor_id, day)
);
