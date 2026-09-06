-- The pack rip. See docs/lab.md, and the store in src/server/deepcuts/store.ts.
--
-- NOTHING WRITES TO THESE TABLES YET, AND THAT IS THE STATE THEY WERE MADE IN. The rip
-- is not built: /lab/deepcuts reads the playlists a pack could come from and opens
-- nothing. The schema is here first because the two figures the page prints at the top,
-- most-opened and rarest-card, are queries against it, and a page that renders them
-- from an empty table renders an honest "nothing yet" rather than a number nobody
-- earned.
--
-- Same rule as 001: THE PLAYLIST IS NOT OURS AND IS NOT COPIED HERE. A rip records the
-- id of the playlist it came out of and nothing else about it. The name printed beside
-- "most opened" is resolved against the shelf that was read from Spotify on the same
-- request, so renaming a playlist renames it on this page too, and deleting one leaves
-- a row that is invisible rather than wrong.

-- One row per pack opened.
--
-- The grain is the RIP, not the card, because "most opened" counts packs. Five cards
-- hang off each of these in the table below.
create table if not exists pack_rip (
  id           bigserial     primary key,
  -- Spotify's playlist id. Text rather than uuid: base62, 22 characters, not ours.
  playlist_id  text          not null,
  -- The same cookie identity the suggestion app mints. See src/server/visitor.ts.
  visitor_id   uuid          not null,
  ripped_at    timestamptz   not null default now()
);

-- "most opened" groups by this and takes the top one.
create index if not exists pack_rip_playlist_id_idx on pack_rip (playlist_id);

-- The five cards that came out of one pack.
--
-- Rows here are a record of what was dealt, so they keep the track's details as they
-- were at the time. That is NOT the duplication the note above refuses: a card is a
-- thing that happened, and what was printed on it does not change afterwards when
-- Spotify's metadata does. The playlist is a live thing being pointed at; a card is not.
create table if not exists pack_card (
  id          bigserial     primary key,
  rip_id      bigint        not null references pack_rip (id) on delete cascade,
  track_uri   text          not null,
  title       text          not null,
  artist      text          not null,
  -- The rung, as the DeepcutTier enum spells it: CHART, ROTATION, ALBUM, DEEPCUT,
  -- UNHEARD. Text rather than an enum type, so adding a rung is a deploy and not a
  -- migration.
  tier        text          not null,
  -- WHERE THAT RUNG SITS ON THE LADDER, 0 FOR THE COMMONEST. Written alongside the name
  -- rather than derived from it, because "rarest ever pulled" is an ORDER BY and the
  -- order is a design decision that lives in DEEPCUT_LADDER in src/constants/lab.ts.
  -- The alternative is teaching Postgres the ladder, which puts the same list in two
  -- places and lets them disagree silently.
  tier_rank   smallint      not null,
  -- What the rung was decided from. Nullable because a track Last.fm cannot match has
  -- no count, and docs/lab.md settles on leaving such a track out of the pack rather
  -- than guessing a rung for it - so this should never be null in practice, and the
  -- column admits it could be rather than pretending otherwise.
  play_count  integer
);

-- "rarest card opened" orders by this and takes the top one.
create index if not exists pack_card_tier_rank_idx on pack_card (tier_rank desc);
