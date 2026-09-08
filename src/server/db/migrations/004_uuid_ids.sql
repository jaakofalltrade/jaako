-- Every surrogate id becomes a uuid.
--
-- 001 and 002 gave three tables a `bigserial` primary key, which is the Postgres default
-- answer and was the wrong one here. Two reasons, and the second is the one that bit.
--
-- ONE: A bigserial ID IS A COUNTER, AND A COUNTER IS PUBLIC INFORMATION. `pack_card.id`
-- is handed to the browser on the collection tab as the key for every card a visitor
-- owns. Sequential ids in that list say how many cards the whole deployment has ever
-- dealt, and two of them a week apart say how fast. Nothing here is a secret worth
-- guarding, but a uuid is the same key for the same purpose and says nothing, and there
-- is no reason to publish a counter as a side effect of rendering a list.
--
-- TWO: bigint DOES NOT FIT A JAVASCRIPT NUMBER, so the driver hands int8 back as a
-- STRING and always has. Every id here was therefore already a string at runtime while
-- `SuggestionRow.id` was declared `number` - a type that typechecked and lied, which is
-- the same class of mistake the `ripped_at: Date` note in the deepcuts store was written
-- about. A uuid is a string in Postgres, a string in the driver and a string in the
-- model, so the three cannot come apart.
--
-- gen_random_uuid() IS BUILT IN: core since Postgres 13, no pgcrypto and no extension,
-- and Neon is well past that. The default lives in the database rather than in the app
-- for the reason `ripped_at` defaults to now() there - a row's own identity is the
-- database's business and an insert should not have to remember it. The one uuid the app
-- mints is the visitor id, in mintVisitor(), because a cookie has to be written before
-- there is any row to read one back from.
--
-- 001 AND 002 ARE NOT EDITED, WHICH IS THE RULE RATHER THAN A PREFERENCE. migrate.mjs
-- keys its ledger on the FILENAME and never re-reads a file it has applied, so rewriting
-- an applied migration changes only what a FRESH database gets and leaves every existing
-- one behind. A migration is history; this is the correction, and a new database reaches
-- the same schema by running both in order.
--
-- NOT WRITTEN `if not exists`, WHICH THE OTHER THREE ARE. A type change has no such
-- form - there is no way to ask `alter column` to skip itself. The safety comes from the
-- two things migrate.mjs already guarantees: the ledger applies a file exactly once, and
-- each file runs inside one transaction, so this lands whole or leaves the schema exactly
-- as it was and stays pending.
--
-- A DROPPED AND RE-ADDED COLUMN MOVES TO THE END OF THE TABLE. That is invisible here
-- because every insert in src/server names its columns and no query selects `*`, but it
-- is why `\d pack_card` will list `id` last after this runs.

-- ---------------- suggestion ----------------
--
-- The easy one. Nothing references this id, and no query in the app has ever selected it,
-- so there is nothing to preserve and the column is simply replaced. Dropping it takes
-- the primary key and the sequence behind the bigserial with it.
--
-- Existing rows each get their own value: gen_random_uuid() is volatile, so Postgres
-- rewrites the table and evaluates the default once per row rather than once for all.
alter table suggestion drop column id;
alter table suggestion add column id uuid not null default gen_random_uuid();
alter table suggestion add primary key (id);

-- ---------------- pack_rip and pack_card ----------------
--
-- These two are a pair, and the order below is load-bearing: pack_card.rip_id points at
-- pack_rip.id and that link is the one piece of history here that cannot be rebuilt from
-- anything else in the row. The old integer keys stay in place until the new uuid ones
-- have been threaded through them.

-- New identities beside the old, so both are readable at once. Each existing row gets a
-- distinct uuid, for the volatile-default reason above - which is exactly what the join
-- below relies on.
alter table pack_rip add column id_uuid uuid not null default gen_random_uuid();
alter table pack_card add column id_uuid uuid not null default gen_random_uuid();
-- Nullable for now. It is filled by the next statement and made not null once it is.
alter table pack_card add column rip_id_uuid uuid;

-- THE STEP THE WHOLE MIGRATION EXISTS FOR: every card re-pointed at its rip through the
-- old integer join, while both columns still exist to join on.
update pack_card as card
   set rip_id_uuid = rip.id_uuid
  from pack_rip as rip
 where rip.id = card.rip_id;

-- pack_card first, and its rip_id before pack_rip.id, because a column cannot be dropped
-- while a foreign key points at it. Dropping the REFERENCING column is what removes that
-- constraint, so the drop below is the whole mechanism and no `drop constraint` is needed
-- - which is just as well, since the constraint's name was never written down anywhere
-- and is only Postgres' generated one.
alter table pack_card drop column rip_id;
alter table pack_card rename column rip_id_uuid to rip_id;
alter table pack_card alter column rip_id set not null;

alter table pack_card drop column id;
alter table pack_card rename column id_uuid to id;
alter table pack_card add primary key (id);

-- Now nothing references pack_rip.id and it can go.
alter table pack_rip drop column id;
alter table pack_rip rename column id_uuid to id;
alter table pack_rip add primary key (id);

-- Re-hung last, once both sides are uuid. The same `on delete cascade` 002 declared: a
-- rip is the grain, and deleting one takes its cards with it.
alter table pack_card
  add constraint pack_card_rip_id_fkey
  foreign key (rip_id) references pack_rip (id) on delete cascade;

-- The three indexes 002 and 003 added are on playlist_id, visitor_id and tier_rank, none
-- of which this touches, so all three survive. What went with the dropped columns was the
-- primary key indexes and the two sequences that backed the bigserials.

-- ---------------- one visible consequence, written down ----------------
--
-- cardsFor orders by `tier_rank desc, ripped_at desc, id desc`. The first two keys are
-- the meaningful ones and are untouched. The third only ever broke ties between THE FIVE
-- CARDS OF ONE RIP, which share a ripped_at to the microsecond, and it used to order them
-- by insertion so the last slot came out first. A random uuid orders them arbitrarily
-- instead - still stable, since the id is fixed once written, but no longer a proxy for
-- slot. Nothing printed on a card says which slot it came from, so this is invisible on
-- the page; it is recorded because `id desc` no longer means what it used to.
