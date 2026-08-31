import "./settings";
import { DateTime } from "luxon";
import { Timezone } from "./constants";

/**
 * An ISO 8601 timestamp in UTC: "2026-08-30T14:07:05.000Z".
 *
 * THE ONLY DATE FORMAT THAT IS EVER WRITTEN DOWN. It is what goes into Neon, what
 * crosses the wire in an API response, and what a model field of type string holds.
 * Nothing else is persisted and nothing else is transported, which is the rule that
 * makes a date's zone a rendering question rather than a storage question - and a
 * storage question is the one you cannot fix later without a migration.
 *
 * NOT ONE OF THESE TAKES A TIMEZONE, and that is the deliberate exception to the
 * folder's usual signature. Every input below is an absolute instant - a DateTime
 * carries its own zone, a JS Date and a millisecond count are offsets from the epoch -
 * and the output zone is already fixed at UTC by the name of the object. So a
 * `timezone` argument here could not change a single character of the returned string.
 * It would be a parameter that callers dutifully pass and nothing reads, which is
 * worse than an inconsistency: it is a lie about what the function depends on.
 *
 * If you want the same instant rendered somewhere other than UTC, you do not want this
 * object at all. You want getShortDate or getClockTime, which is where zones live.
 */
export const getIsoDateTimeUtc = {
  /** Right now, as the string Neon and the wire take. */
  now: (): string => DateTime.utc().toISO(),

  /** A DateTime in any zone, moved to UTC. The instant is unchanged; only the zone is. */
  fromDateTime: (args: { date_time: DateTime }): string => args.date_time.toUTC().toISO(),

  /** A JS Date, for the boundaries that still produce one. */
  fromJsDate: (args: { js_date: Date }): string =>
    DateTime.fromJSDate(args.js_date, { zone: Timezone.Utc }).toISO(),

  /** Epoch milliseconds. */
  fromMilliseconds: (args: { milliseconds: number }): string =>
    DateTime.fromMillis(args.milliseconds, { zone: Timezone.Utc }).toISO(),
};
