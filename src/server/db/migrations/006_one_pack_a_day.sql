-- One pack per visitor per playlist per day, enforced by the database.
--
-- THE BUG THIS CLOSES. ripPack deals from a generator seeded on the visitor, the playlist
-- and the Manila day, so opening the same pack twice on the same day deals THE SAME FIVE
-- CARDS - that is what makes a pack stable across a refresh, and it is the whole reason
-- the draw is seeded rather than random. The WRITE had no matching guarantee. recordRip
-- inserted unconditionally, so a second click wrote a second pack_rip row and five more
-- pack_card rows holding the identical five cards, and the collection tab showed each of
-- them twice.
--
-- The route already says the tally is deliberately not idempotent: "a second post is a
-- second time somebody opened the pack, and most opened is counting openings rather than
-- distinct packs." That reasoning is about the two figures at the top of the page and it
-- still holds. It was never an argument for duplicating the binder.
--
-- SO THE TWO ARE SEPARATED. A pack is one row, and how many times it was opened is a
-- number on that row:
--
--     pack_rip   one row per (visitor, playlist, day)   <- the pack
--     .opens     how many times it was torn open        <- the tally
--     pack_card  five rows per pack, once               <- the binder
--
-- "most opened" becomes sum(opens) rather than count(*), so the figure counts exactly
-- what it counted before and the collection stops repeating itself.
--
-- WHY A CONSTRAINT RATHER THAN A CHECK BEFORE THE INSERT. A read-then-write has a window:
-- two clicks arriving together both find no row and both write one. That is the same race
-- the suggestion cap was designed around, and the same answer applies - let the database
-- be the thing that decides, with one statement conflicting on a key. See recordRip.

-- ---------------- pack_rip: the day, and the tally ----------------

-- THE SAME DAY KEY THE DRAW IS SEEDED WITH, and that is the point rather than a
-- coincidence. ripPack computes `getIsoDate.now({ timezone: Timezone.Manila })` for
-- packSeed and now hands the same string to recordRip, so "the same pack" means exactly
-- the same thing to the generator and to this constraint. Computed by the application for
-- the reason the add cap moved off current_date: Postgres's idea of today is UTC, and a
-- pack should reset at local midnight rather than at eight in the morning.
--
-- date, NOT text, unlike the ISO columns beside it. This is a bucket label rather than an
-- instant - the same argument visitor.day carries - and it is compared for equality, never
-- rendered.
alter table pack_rip add column day date;

-- Backfilled by converting each rip's stored instant into the Manila calendar day it fell
-- on, which is the day it would have been seeded with. The cast is exactly the one 005
-- said would still work: the text is a fixed-shape ISO UTC string, so ::timestamptz parses
-- it, and `at time zone` moves it into the zone the cap is counted in.
update pack_rip
   set day = (ripped_at_iso_datetime_utc::timestamptz at time zone 'Asia/Manila')::date;

-- How many times this pack was torn open. Defaults to 1 because a row only exists once a
-- pack has been opened at least once; there is no state where a rip exists with zero.
alter table pack_rip add column opens smallint not null default 1;

-- ---------------- collapse the duplicates that already exist ----------------
--
-- ORDER MATTERS HERE. The count has to be taken while the duplicates are still present,
-- so the survivor inherits the full tally, and only then are the extras removed. Done the
-- other way round, every repeated opening is silently forgotten and the counters drop.

-- The earliest rip of each pack keeps the row and absorbs the count.
update pack_rip as r
   set opens = d.total
  from (
    select id,
           row_number() over (
             partition by visitor_id, playlist_id, day
             order by ripped_at_iso_datetime_utc asc, id asc
           ) as rn,
           count(*) over (partition by visitor_id, playlist_id, day) as total
      from pack_rip
  ) as d
 where d.id = r.id and d.rn = 1 and d.total > 1;

-- And the later ones go, taking their duplicate cards with them through the cascade 002
-- declared. THE SURVIVOR IS THE EARLIEST, which is the one whose cards were dealt first;
-- since the seed is the same for every rip of the same pack on the same day, the deleted
-- rows held identical cards and nothing a visitor could see is lost.
delete from pack_rip as r
 using (
   select id,
          row_number() over (
            partition by visitor_id, playlist_id, day
            order by ripped_at_iso_datetime_utc asc, id asc
          ) as rn
     from pack_rip
 ) as d
 where d.id = r.id and d.rn > 1;

alter table pack_rip alter column day set not null;

-- The constraint the whole migration is for. A second rip of the same pack on the same day
-- now conflicts instead of inserting, and recordRip turns that conflict into `opens + 1`.
alter table pack_rip
  add constraint pack_rip_visitor_playlist_day_key unique (visitor_id, playlist_id, day);

-- ---------------- pack_card: the slot ----------------
--
-- WHY THIS COLUMN IS PART OF THE SAME CHANGE. Stopping the second rip from inserting is
-- only half of it: the card writes have to be idempotent too, or a rip whose cards failed
-- halfway - which 002 notes is possible, because the HTTP driver has no transaction - would
-- be a pack that can never be completed, since every later attempt now finds the rip row
-- and skips. With a unique (rip_id, slot), the insert is `on conflict do nothing` and a
-- half-written pack repairs itself the next time it is opened.
--
-- track_uri CANNOT BE THAT KEY, which is why it is the slot. A playlist can list one
-- recording twice under two Spotify uris, so a pack can legitimately deal the same track
-- more than once - packContents says so and a version that de-duplicated was reverted. The
-- slot is the only thing about a card that is unique within its pack.
--
-- It also gives back something 004 took away. PackCard has carried a `slot` since the draw
-- was written and it was never stored, so the collection ordered the five cards of one rip
-- by `id desc`, which was reverse insertion order while the id was a bigserial. A random
-- uuid is not, so that tiebreak became arbitrary. Now it is the slot, said out loud.
alter table pack_card add column slot smallint;

-- EXISTING ROWS GET A DISTINCT SLOT, NOT A TRUE ONE, and the difference is worth stating.
-- Deal order for cards already in the table is not recoverable: the column did not exist
-- when they were written, and 004 replaced the only other trace of insertion order with a
-- random uuid. row_number gives each card in a pack a different number so the constraint
-- can be added; for rows written from here on it is the real slot the draw put them in.
update pack_card as c
   set slot = s.rn - 1
  from (
    select id, row_number() over (partition by rip_id order by id) as rn
      from pack_card
  ) as s
 where s.id = c.id;

alter table pack_card alter column slot set not null;

alter table pack_card
  add constraint pack_card_rip_id_slot_key unique (rip_id, slot);
