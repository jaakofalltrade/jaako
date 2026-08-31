import "./settings";
import { DateTime } from "luxon";
import { Timezone } from "./constants";

/**
 * A luxon DateTime, in the zone you asked for. The workhorse the rest of oras is
 * built on, and the only place in the codebase that calls luxon's own constructors.
 *
 * Every method takes an instant and a zone and hands back that same instant seen from
 * that zone. NONE OF THEM MOVE THE MOMENT IN TIME - `fromMilliseconds` with Manila and
 * with Utc describe one instant twice, they do not describe two instants. That is worth
 * stating because it is the single thing people get wrong about zoned datetimes, and
 * every bug this folder exists to prevent is a version of it.
 *
 * WHY `now` TAKES A TIMEZONE WHEN THE OTHERS' NAMES SAY IT SHOULD NOT. The rule this
 * folder follows is that `timezone` appears wherever it changes the answer and is
 * absent wherever it cannot. A DateTime is always in some zone, so there is no way to
 * hand one back without having picked one, and leaving the argument off here would not
 * remove the decision - it would only hide it behind a default nobody passed. Compare
 * getIsoDateTimeUtc.now(), which genuinely needs no zone because its name has already
 * fixed the answer at UTC.
 */
export const getDateTime = {
  /** This moment, seen from `timezone`. */
  now: (args: { timezone: Timezone }): DateTime => DateTime.now().setZone(args.timezone),

  /**
   * A stored or transported timestamp, seen from `timezone`.
   *
   * The parse is pinned to UTC rather than left to luxon's default, and that matters
   * for the one input shape this app really does see: Postgres can hand back
   * "2026-08-30 14:07:05+00" and Spotify sends "2026-08-30T14:07:05Z", but a value
   * that has lost its offset somewhere upstream would otherwise be read in whatever
   * zone the machine happens to be in. Pinning it means a missing offset is read as
   * UTC on every machine, which is at least the same wrong answer everywhere rather
   * than a different one per deployment.
   */
  fromIsoDateTimeUtc: (args: { iso_date_time_utc: string; timezone: Timezone }): DateTime =>
    DateTime.fromISO(args.iso_date_time_utc, { zone: Timezone.Utc }).setZone(args.timezone),

  /** A JS Date, seen from `timezone`. The boundary with anything still handing us one. */
  fromJsDate: (args: { js_date: Date; timezone: Timezone }): DateTime =>
    DateTime.fromJSDate(args.js_date, { zone: args.timezone }),

  /** Epoch milliseconds, seen from `timezone`. */
  fromMilliseconds: (args: { milliseconds: number; timezone: Timezone }): DateTime =>
    DateTime.fromMillis(args.milliseconds, { zone: args.timezone }),
};
