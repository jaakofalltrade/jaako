import "./settings";
import { DateTime } from "luxon";
import { Timezone } from "./constants";

/**
 * A calendar day with no time on it: "2026-08-30".
 *
 * A day is not a timestamp, and the difference is the entire reason this is its own
 * function. A timestamp names an instant every zone agrees on; A DAY IS A CLAIM ABOUT
 * WHOSE CALENDAR YOU MEAN. 2026-08-30 in Manila and 2026-08-30 in UTC are different
 * sixteen-hour-overlapping spans, so `timezone` is not decoration here - it is the
 * question being asked, which is why `now` takes one where getIsoDateTimeUtc.now()
 * rightly does not.
 *
 * WHAT THIS IS FOR. The suggest app's daily add cap counts three per visitor per day,
 * and "per day" used to be decided by Postgres, whose current_date is UTC. Manila is
 * UTC+8, so the counter reset at eight in the morning rather than at midnight: someone
 * who used their three at nine in the evening was still capped at half past midnight,
 * because Postgres was still on the previous afternoon. Nobody reported it, and nobody
 * would - it just felt like the cap was longer than a day.
 *
 * Computing the key here instead moves the boundary to Manila midnight. It is still a
 * single bound parameter into the same conditional upsert, so the property that makes
 * the cap race-proof - the composite primary key it conflicts against - is untouched.
 */
export const getIsoDate = {
  /** Today, on `timezone`'s calendar. */
  now: (args: { timezone: Timezone }): string => DateTime.now().setZone(args.timezone).toISODate(),
};
