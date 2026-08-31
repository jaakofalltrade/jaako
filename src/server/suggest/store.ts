import "server-only";
import type { SuggestionRow } from "@/models";
import { getIsoDate, Timezone } from "@/oras";
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
 * Spends one of the visitor's daily adds, if any are left.
 *
 * ONE STATEMENT, NOT A READ THEN A WRITE, AND THAT IS THE WHOLE POINT OF IT. The
 * conditional upsert either returns the new count or returns nothing, and returning
 * nothing is what "you have used your three" means. Two requests arriving together
 * cannot both see two: the conflict target is the composite primary key, so the second
 * one updates the row the first one just wrote.
 *
 * Exercised against a real database before any of this was written: a cap of three
 * allows three and refuses the fourth.
 *
 * THE DAY IS COMPUTED HERE NOW, NOT BY POSTGRES, and that is a behaviour change rather
 * than a tidy-up. It used to be `current_date`, which is UTC, so the counter reset at
 * eight in the morning in Manila rather than at midnight: somebody who used their three
 * at nine in the evening was still refused at half past midnight, because Postgres was
 * still on the previous afternoon. Nobody would ever report that - it just felt like
 * the cap lasted longer than a day.
 *
 * Passing the key in changes nothing else. It is still one bound parameter in one
 * statement, still conflicting against the same composite primary key, so the property
 * that makes this race-proof is untouched.
 *
 * WHY THIS IS NOT UTC, WHICH IS THE FIRST THING ANYBODY ASKS. Everything this codebase
 * puts in Neon is an ISO timestamp in UTC - see src/oras - and this column is the one
 * exception, because it is not a timestamp. `day` is a BUCKET LABEL: the thing the
 * counter hangs off, and half of the primary key. "31 August in Manila" is a span of
 * twenty-four hours, not an instant, and UTC is a way of naming instants. Storing it
 * "in UTC" would mean storing the moment the Manila day begins - 2026-08-30T16:00Z for
 * the 31st - which is the same information written so that nobody reading the table can
 * see what day it means.
 *
 * And there is nowhere to convert it back. NO QUERY IN THIS APP EVER SELECTS `day`.
 * It is written as part of the key and matched against by the upsert below, and that is
 * the whole of its life, so "store it in UTC and convert on read" has no read to happen
 * at. Whichever calendar names the bucket has to be settled here, at write time.
 */
export const reserveAdd = async (args: {
  visitor_id: string;
  cap: number;
}): Promise<boolean> => {
  const { visitor_id, cap } = args;
  const day = getIsoDate.now({ timezone: Timezone.Manila });

  const rows = await sql`
    insert into visitor_day as v (visitor_id, day, adds)
    values (${visitor_id}, ${day}, 1)
    on conflict (visitor_id, day) do update
       set adds = v.adds + 1
     where v.adds < ${cap}
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
    update visitor_day
       set adds = greatest(adds - 1, 0)
     where visitor_id = ${args.visitor_id} and day = ${day}
  `;
};

/**
 * Records who suggested what.
 *
 * Annotation only. A row here describes a track that is already on the playlist and
 * can never put one there, which is what makes removing a track in Spotify enough to
 * remove it from the page.
 */
export const record = async (args: {
  track_uri: string;
  name: string;
  visitor_id: string;
}): Promise<void> => {
  const { track_uri, name, visitor_id } = args;

  await sql`
    insert into suggestion (track_uri, name, visitor_id)
    values (${track_uri}, ${name}, ${visitor_id})
  `;
};

/**
 * The name against each of the given uris.
 *
 * ONE QUERY FOR THE WHOLE PAGE, not one per row. The uris arrive as an array and go out
 * as a single bound parameter, so a hundred-track playlist is one round trip.
 *
 * `distinct on` keeps the EARLIEST suggestion for each track, which is the answer the
 * page wants: a track can be suggested, removed in Spotify, and suggested again by
 * somebody else, and the row that matches what is on the playlist now is the one whose
 * add put it there. Ordering by added_at ascending is what makes that the first row.
 *
 * Returns a plain object rather than a Map because it is handed straight to a render
 * and looked up by key; a Map would only be ceremony at the call site.
 */
export const namesByUri = async (args: {
  uris: string[];
}): Promise<Record<string, string>> => {
  if (!args.uris.length) return {};

  const rows = await sql<Pick<SuggestionRow, "track_uri" | "name">>`
    select distinct on (track_uri) track_uri, name
      from suggestion
     where track_uri = any(${args.uris})
     order by track_uri, added_at asc
  `;

  return Object.fromEntries(rows.map((row) => [row.track_uri, row.name]));
};

/** Whether the store can be reached at all. Reads degrade on false; writes refuse. */
export const hasStore = hasDatabase;
