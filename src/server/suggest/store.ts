import "server-only";
import type { SuggestionRow, TrackSnapshot } from "@/models";
import { getIsoDate, getIsoDateTimeUtc, Timezone } from "@/oras";
import { hasDatabase, sql } from "@/server/db";

/**
 * The four queries this app makes, and only those.
 *
 * A data-access module rather than the generic key-value store docs/lab.md first
 * sketched. That sketch assumed Redis and a counter; the store became Postgres once
 * the roast app's per-visitor tokens and this app's attribution rows joined the
 * requirement, and a domain-shaped interface is what a relational store wants.
 *
 * NOTHING ELSE IN THE APP WRITES SQL. That is the rule that keeps swapping the backing
 * store a one-file change, which is the property docs/lab.md was really asking for.
 *
 * Every interpolation below is a bound parameter, because that is what the tagged
 * template does. The ordinary way to write these is also the safe one.
 */

/**
 * Spends one of the visitor's daily adds, if any are left, and records who they are.
 *
 * ONE STATEMENT, NOT A READ THEN A WRITE, AND THAT IS STILL THE WHOLE POINT OF IT. The
 * conditional upsert either returns the new count or returns nothing, and returning
 * nothing is what "you have used your three" means. Two requests arriving together
 * cannot both see two: the conflict target is the primary key, so the second one updates
 * the row the first one just wrote.
 *
 * THE CONFLICT TARGET CHANGED SHAPE IN 005 AND THE PROPERTY DID NOT. It used to be the
 * composite key (visitor_id, day), one row per visitor per day, so a new day simply
 * missed every existing row and inserted a fresh one. There is one row per visitor now,
 * so the row itself has to be told the day has rolled over:
 *
 *     same day, under the cap   ->  adds + 1
 *     a different day           ->  adds = 1, day = today
 *     same day, at the cap      ->  the `where` fails, no row comes back, refused
 *
 * `is distinct from` rather than `<>`, because a visitor minted by a pack rip has a NULL
 * day and has never spent an add. `null <> '2026-09-07'` is null, which is not true, so
 * the where would reject them and their first suggestion would be refused as though they
 * had used an allowance they never had.
 *
 * THE NAME RIDES ALONG, which is new and is not a conflation. This upsert is the one
 * statement that guarantees the visitor's row exists, and suggestion.visitor_id is a
 * foreign key to it as of 005 - so if the name were written separately, there would be a
 * window where the row exists unnamed and a second round trip that could fail on its own.
 * One statement, one round trip, one row that is complete the moment it exists.
 *
 * coalesce, SO A NULL NAME NEVER ERASES A GOOD ONE. Nothing sends null today; the add
 * route validates a name before it reaches here. It is written this way so that a future
 * caller which does not have a name - a pack rip minting its visitor, say - cannot blank
 * the one the visitor already chose.
 *
 * WHY THE DAY IS COMPUTED HERE, NOT BY POSTGRES. It used to be `current_date`, which is
 * UTC, so the counter reset at eight in the morning in Manila rather than at midnight:
 * somebody who used their three at nine in the evening was still refused at half past
 * midnight, because Postgres was still on the previous afternoon. Nobody would ever
 * report that - it just felt like the cap lasted longer than a day.
 *
 * `day` IS THE ONE COLUMN IN THIS REPO THAT IS NOT UTC, and it is not a timestamp. It is
 * a BUCKET LABEL: the thing the counter hangs off. "31 August in Manila" is a span of
 * twenty-four hours, not an instant, and UTC is a way of naming instants. Storing it "in
 * UTC" would mean storing the moment the Manila day begins, which is the same information
 * written so that nobody reading the table can see what day it means. No query ever
 * selects it; it is written and matched against, and that is the whole of its life.
 */
export const reserveAdd = async (args: {
  visitor_id: string;
  name: string | null;
  cap: number;
}): Promise<boolean> => {
  const { visitor_id, name, cap } = args;
  const day = getIsoDate.now({ timezone: Timezone.Manila });

  const rows = await sql`
    insert into visitor as v (id, name, day, adds)
    values (${visitor_id}, ${name}, ${day}, 1)
    on conflict (id) do update
       set adds = case when v.day = excluded.day then v.adds + 1 else 1 end,
           day  = excluded.day,
           name = coalesce(excluded.name, v.name)
     where v.day is distinct from excluded.day or v.adds < ${cap}
    returning v.adds
  `;

  return rows.length > 0;
};

/**
 * Puts one back, for when Spotify refuses the add after the allowance was spent.
 *
 * greatest(...,0) rather than a bare subtraction: a release without a matching reserve
 * should not be able to drive the count negative and hand somebody a fourth add.
 */
export const releaseAdd = async (args: { visitor_id: string }): Promise<void> => {
  // The same key reserveAdd wrote. If these two ever disagree about which day it is,
  // a release silently updates nothing and the visitor loses an add they never spent.
  const day = getIsoDate.now({ timezone: Timezone.Manila });

  await sql`
    update visitor
       set adds = greatest(adds - 1, 0)
     where id = ${args.visitor_id} and day = ${day}
  `;
};

/**
 * Records who suggested what, and what the track was at the time.
 *
 * STILL ANNOTATION, WHICH IS THE THING 005 HAD TO ARGUE FOR. A row here describes a
 * track that is already on the playlist and can never put one there, so removing a track
 * in Spotify still removes it from the page with no code involved. What the snapshot adds
 * is a record that outlives the removal: before 005, a track that left the playlist left
 * behind a `track_uri` and nothing a person could read.
 *
 * THE SNAPSHOT IS NOT THE SOURCE OF TRUTH AND MUST NOT BECOME ONE. The queue is built by
 * reading the playlist from Spotify and joining these rows onto it; nothing renders the
 * list out of this table. The moment something does, a track removed over there stops
 * leaving the page and the page starts lying. See the note on SuggestionRow.
 *
 * THE TIMESTAMP IS OURS NOW, WRITTEN THROUGH oras. The column defaulted to now() until
 * 005, which was Postgres deciding what time it is; one clock, named in one place, is
 * the same rule that moved the daily cap off current_date.
 */
export const record = async (args: {
  track_uri: string;
  visitor_id: string;
  track: TrackSnapshot;
}): Promise<void> => {
  const { track_uri, visitor_id, track } = args;

  await sql`
    insert into suggestion (
      track_uri, visitor_id, added_at_iso_datetime_utc,
      track_name, artist, album, album_art, track_url, duration_ms
    )
    values (
      ${track_uri}, ${visitor_id}, ${getIsoDateTimeUtc.now()},
      ${track.track_name}, ${track.artist}, ${track.album},
      ${track.album_art}, ${track.track_url}, ${track.duration_ms}
    )
  `;
};

/**
 * The name against each of the given uris.
 *
 * ONE QUERY FOR THE WHOLE PAGE, not one per row. The uris arrive as an array and go out
 * as a single bound parameter, so a hundred-track playlist is one round trip.
 *
 * IT JOINS TO visitor NOW, which is where the name lives as of 005. Before that the name
 * was copied onto every suggestion, so one visitor with nine suggestions was nine copies
 * of the same string and renaming yourself updated nothing.
 *
 * `distinct on` keeps the EARLIEST suggestion for each track, which is the answer the
 * page wants: a track can be suggested, removed in Spotify, and suggested again by
 * somebody else, and the row that matches what is on the playlist now is the one whose
 * add put it there. Ordering by the timestamp ascending is what makes that the first row,
 * and it still works on a text column because an ISO UTC string sorts lexicographically
 * in chronological order. See 005 for why that is guaranteed rather than lucky.
 *
 * Returns a plain object rather than a Map because it is handed straight to a render
 * and looked up by key; a Map would only be ceremony at the call site.
 */
export const namesByUri = async (args: {
  uris: string[];
}): Promise<Record<string, string>> => {
  if (!args.uris.length) return {};

  const rows = await sql<{ track_uri: string; name: string | null }>`
    select distinct on (s.track_uri) s.track_uri, v.name
      from suggestion as s
      join visitor as v on v.id = s.visitor_id
     where s.track_uri = any(${args.uris})
     order by s.track_uri, s.added_at_iso_datetime_utc asc
  `;

  /* A visitor who has never given a name has a null one, and a row with no attribution
     renders without a name rather than with an empty one. Dropping it here means the
     caller's `?? null` is the only place that decision is made. */
  return Object.fromEntries(
    rows.flatMap((row) => (row.name ? [[row.track_uri, row.name] as const] : []))
  );
};

/**
 * One visitor's own suggestions, newest first, out of the snapshot.
 *
 * THE ONE READ THAT DOES NOT ASK SPOTIFY, and the reason the snapshot columns exist. It
 * answers "what have I suggested", including tracks that have since been removed from the
 * playlist, which the join against Spotify cannot do by construction: a removed track is
 * not in the list to be joined onto.
 *
 * That is a different question from "what is on the playlist", and it is the only
 * question this table is allowed to answer on its own. Reading the QUEUE from here is
 * what would make the page lie.
 *
 * Rows written before 005 have no snapshot and come back with nulls in every field but
 * the uri and the date. That is honest: nothing recorded what those tracks were called.
 */
export const suggestionsFor = async (args: {
  visitor_id: string;
  limit: number;
}): Promise<SuggestionRow[]> => {
  if (!hasDatabase()) return [];

  return sql<SuggestionRow>`
    select id, track_uri, visitor_id, added_at_iso_datetime_utc,
           track_name, artist, album, album_art, track_url, duration_ms
      from suggestion
     where visitor_id = ${args.visitor_id}
     order by added_at_iso_datetime_utc desc
     limit ${args.limit}
  `;
};

/** Whether the store can be reached at all. Reads degrade on false; writes refuse. */
export const hasStore = hasDatabase;
