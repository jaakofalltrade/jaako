-- The visitor becomes a row, and a suggestion starts remembering what it was.
--
-- Three changes that only make sense together.
--
-- ONE: visitor_day BECOMES visitor. The table was a counter with a composite key,
-- (visitor_id, day), and no row anywhere described the PERSON. Their display name lived
-- on every suggestion they had ever made, so one visitor with nine suggestions was nine
-- copies of the same string and renaming yourself was nine updates nobody wrote. The
-- grain moves from "one visitor per day" to "one visitor", the name moves onto it, and
-- the allowance stays as two columns on that row.
--
-- TWO: suggestion.visitor_id BECOMES A REAL FOREIGN KEY. It has always held a visitor's
-- uuid and has never been able to prove it, because there was nothing to point at. Now
-- there is.
--
-- THREE: A SUGGESTION KEEPS A SNAPSHOT OF THE TRACK. This is the change that argues with
-- 001, so it is argued with here rather than made quietly.
--
--     001 said: the playlist is the source of truth, a row here annotates a track and
--     can never conjure one, and removing a track in Spotify removes it from the page
--     with no code involved.
--
-- ALL OF THAT STAYS TRUE. The queue is still built by reading the playlist from Spotify
-- and joining these rows onto it, so a track removed over there still leaves the page
-- with no code involved and the orphaned row is still invisible rather than wrong. What
-- the columns below add is HISTORY, which the old shape genuinely could not hold: once a
-- track left the playlist, the fact that somebody suggested it survived as a track_uri
-- and nothing a human could read.
--
-- The precedent is 003, which put the artwork and the title on pack_card and defended it
-- in one sentence: a card is a thing that happened, and what was printed on it does not
-- change afterwards when Spotify's metadata does. A suggestion is the same kind of fact.
--
-- WHAT IT COSTS, SAID PLAINLY. These columns go stale. Spotify re-issues a record with
-- new artwork, a title picks up a "- Remastered" suffix, and the snapshot keeps what was
-- there on the day. That is correct for history and wrong for a live list, which is
-- exactly why THE QUEUE MUST KEEP RENDERING FROM THE SPOTIFY JOIN and not from these.
-- The moment something renders the list out of this table, removing a track in Spotify
-- stops removing it from the page, and the page starts lying. See the note on
-- SuggestionRow.
--
-- FOUR: THE TWO TIMESTAMP COLUMNS ARE RENAMED FOR WHAT THEY HOLD, and change type with
-- the name. See the block above added_at_iso_datetime_utc.

-- ---------------- visitor ----------------
--
-- Renamed rather than created and copied, so every existing allowance row keeps its
-- count and its uuid. A visitor who has spent two of today's three adds still has one
-- when this lands.
alter table visitor_day rename to visitor;

-- The composite key goes: the grain is one row per visitor now, and `day` is a column
-- on that row rather than half of its identity.
alter table visitor drop constraint visitor_day_pkey;
alter table visitor rename column visitor_id to id;
alter table visitor add primary key (id);

-- NULLABLE, AND THAT IS A REAL STATE RATHER THAN A MISSING VALUE. A visitor is minted by
-- mintVisitor() the first time anything is worth counting against them, which for a pack
-- rip is before they have ever typed a name. Null means "has not said", and the row
-- renders without an attribution exactly as it did when the name was absent from a
-- suggestion.
alter table visitor add column name text;

-- `day` and `adds` stay, and stay together: they are the current allowance bucket, not a
-- history. reserveAdd resets them when the day rolls over rather than writing a new row,
-- which is why `day` is now nullable - a visitor minted by a pack rip has no allowance
-- until they spend one, and the orphan insert below depends on that being legal.
alter table visitor alter column day drop not null;

-- ORPHANS BEFORE THE BACKFILL, AND BEFORE THE FOREIGN KEY. A suggestion whose visitor
-- never reached visitor_day has nothing to point at: 001 wrote the suggestion row through
-- a different path from the allowance upsert, so the two could disagree. There should be
-- none of these, and this is written so that there are none rather than assuming it.
--
-- It runs first so that the ONE backfill below names every visitor, including these. Done
-- the other way round - and it was, first time - a visitor who only ever suggested and
-- never spent a counted allowance is created after the names are copied and ends up
-- nameless, having typed a name into the box every time.
insert into visitor (id, adds)
select distinct s.visitor_id, 0
  from suggestion as s
  left join visitor as v on v.id = s.visitor_id
 where v.id is null;

-- Backfilled from the suggestions the visitor has already made, most recent first, so
-- nobody loses the name they were using. distinct on takes one row per visitor.
update visitor as v
   set name = latest.name
  from (
    select distinct on (visitor_id) visitor_id, name
      from suggestion
     order by visitor_id, added_at desc
  ) as latest
 where latest.visitor_id = v.id;

-- ---------------- suggestion ----------------
--
-- The name goes. It described the person, not the suggestion, and the person now has a
-- row. Dropped AFTER the backfill above, which reads it.
alter table suggestion drop column name;

alter table suggestion
  add constraint suggestion_visitor_id_fkey
  foreign key (visitor_id) references visitor (id) on delete cascade;

-- Cascading is the "forget me" path. Deleting a visitor takes the rows that are ABOUT
-- them with it; the tracks stay on the playlist, because the playlist was never ours.

-- The join the FK implies, from the other direction. The page reads one visitor's rows;
-- nothing indexed suggestion by visitor before.
create index if not exists suggestion_visitor_id_idx on suggestion (visitor_id);

-- ---------------- the timestamps ----------------
--
-- RENAMED FOR WHAT THEY HOLD, AND RETYPED TO MATCH THE NAME. src/oras states the rule
-- these columns were already meant to follow: a datetime is STORED and TRANSPORTED as an
-- ISO 8601 string in UTC, and converted to a zone only when it is rendered. A column
-- called `added_at` of type timestamptz was two steps away from that. The driver handed
-- back a JS Date, every read had to call .toISOString() to get back to the wire format,
-- and the deepcuts store carries a comment about exactly that conversion being a place
-- the type could lie.
--
-- text, THEREFORE, AND THE NAME IS THE CONTRACT. getIsoDateTimeUtc.now() is the only
-- thing that writes these, and it always emits the same shape from luxon:
-- "2026-09-07T14:07:05.000Z" - always UTC, always Z, always milliseconds. Fixed width,
-- fixed offset, so LEXICOGRAPHIC ORDER IS CHRONOLOGICAL ORDER and every `order by` in
-- the app keeps working unchanged.
--
-- WHAT THIS GIVES UP, and it is not nothing: Postgres can no longer do date arithmetic
-- on these without a cast. No `where ripped_at > now() - interval '7 days'`, no
-- date_trunc for grouping by month. Nothing in the app does either of those today - the
-- only date arithmetic here is the daily cap, which is a `day` column of type date and
-- stays one - and if a query ever wants them, the cast is `::timestamptz` and the shape
-- above is guaranteed to parse. The trade is real and it is made in favour of one format
-- that is the same in Postgres, on the wire and in the model.
--
-- THE RISK TO WATCH: this only holds while getIsoDateTimeUtc is the sole writer. A value
-- inserted with an offset like +08:00 instead of Z sorts wrongly against the rest and
-- nothing will complain. That is what the check constraints below are for.

-- THE DEFAULT GOES FIRST, AND NOT ONLY BECAUSE IT SHOULD. Postgres refuses to change a
-- column's type while a default is attached that cannot be cast to the new one, and
-- now() cannot become text: "default for column cannot be cast automatically". So this
-- line is load-bearing rather than tidy, and it has to precede the type change.
--
-- It should go anyway. Both columns defaulted to now(), which is Postgres deciding what
-- time it is. The application decides now, through oras, for the same reason the daily
-- cap moved off current_date: one clock, named in one place. A write that forgets the
-- column now fails loudly instead of quietly recording the database's idea of the moment.
alter table suggestion alter column added_at drop default;
alter table suggestion rename column added_at to added_at_iso_datetime_utc;
alter table suggestion
  alter column added_at_iso_datetime_utc type text
  using to_char(added_at_iso_datetime_utc at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

alter table pack_rip alter column ripped_at drop default;
alter table pack_rip rename column ripped_at to ripped_at_iso_datetime_utc;
alter table pack_rip
  alter column ripped_at_iso_datetime_utc type text
  using to_char(ripped_at_iso_datetime_utc at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

-- The guard the format contract needs, since text will accept anything. Cheap on insert,
-- and it turns "somebody wrote a local time in here" from a silent sorting bug into a
-- failed write.
alter table suggestion
  add constraint suggestion_added_at_is_iso_utc
  check (added_at_iso_datetime_utc ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$');

alter table pack_rip
  add constraint pack_rip_ripped_at_is_iso_utc
  check (ripped_at_iso_datetime_utc ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$');

-- ---------------- the track snapshot ----------------
--
-- Every column nullable, because every one of them is a fact about a Spotify track that
-- Spotify itself reports as optional, and because rows written before this migration have
-- none of them. A suggestion from last week renders from the live join exactly as it
-- always did; only its history is thinner.
--
-- track_name RATHER THAN title, WHICH pack_card USES. They are not the same field doing
-- the same job: pack_card.title is what was PRINTED on a card, and this is what the track
-- was CALLED when it was suggested. The names are different because a future reader
-- comparing the two tables should not assume one is a copy of the other.
alter table suggestion add column track_name text;
alter table suggestion add column artist text;
alter table suggestion add column album text;
-- i.scdn.co, host-checked by pickAlbumArt before it ever reaches here, and the page's CSP
-- is the second lock. Same column and same rule as pack_card.album_art.
alter table suggestion add column album_art text;
alter table suggestion add column track_url text;
-- Milliseconds, as Spotify reports it and as MAX_TRACK_MS is measured in. integer holds
-- about 24 days, which is comfortably past the longest track anybody has recorded.
alter table suggestion add column duration_ms integer;
