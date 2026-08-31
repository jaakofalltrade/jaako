/**
 * The zones this site names, and the only ones it should.
 *
 * THE VALUES ARE NOT SCREAMING CASE, which is the single place this breaks the shape
 * every other enum in the codebase follows. SuggestFailure and RowState invent their
 * own identifiers, so they are free to shout them; these three are matched literally,
 * by luxon against the IANA database and by Intl against the host's zone table.
 * "ASIA/MANILA" is not a zone. The convention marks a value as ours to choose, and
 * these are not ours to choose.
 *
 * Three members rather than a transcription of the IANA list. Every zone a visitor
 * could be sitting in is reachable through System without being written down, so the
 * only names worth enumerating are the two this codebase anchors to and the token for
 * "ask the environment".
 */
export enum Timezone {
  /**
   * Where the work happens.
   *
   * The status clock reads this, and so does the daily add cap - see getIsoDate and
   * the note above reserveAdd in server/suggest/store.ts for why the cap moved off
   * Postgres's current_date and onto this.
   */
  Manila = "Asia/Manila",

  /**
   * What Neon holds and what crosses the wire.
   *
   * NEVER A DISPLAY ZONE. Nothing on this site is rendered in UTC; it is only ever
   * stored and transported in it, which is the whole rule this folder exists to keep.
   */
  Utc = "UTC",

  /**
   * A zone this site never renders, kept so the test suite can prove DST is handled.
   *
   * THE PHILIPPINES HAS NO DAYLIGHT SAVING, which makes Manila a poor witness: every
   * assertion written against it holds at a flat UTC+8 all year, so a suite built only
   * on Manila and UTC cannot tell correct zone handling apart from adding eight hours.
   * Sydney is UTC+10 in August and UTC+11 in January, and on the morning its clocks go
   * back, 2026-04-04T15:30Z and 2026-04-04T16:30Z - an hour apart - both read 02:30.
   * Nothing anchored to Manila can produce that, and it is exactly the case that breaks
   * hand-rolled date arithmetic.
   *
   * It earns its place in the enum rather than living in the tests because every
   * signature in oras is typed against this type; a bare IANA string would not compile.
   * If a reader is ever actually shown Sydney time, this comment is wrong and the
   * member should be documented like Manila is.
   */
  Sydney = "Australia/Sydney",

  /**
   * Luxon's token for whatever zone the environment happens to be in.
   *
   * IN THE BROWSER THIS IS THE VISITOR'S OWN ZONE, resolved through
   * Intl.DateTimeFormat().resolvedOptions().timeZone - that is literally what luxon's
   * SystemZone#name returns, so there is nothing for us to read or plumb.
   *
   * ON THE SERVER IT IS THE HOST'S ZONE, which is UTC on Vercel, and it is not the
   * visitor's and cannot be: the server renders before any browser has spoken. That
   * asymmetry is not a luxon limitation, it is the order events happen in, and it is
   * the entire reason useTimezone exists. Read the note there before rendering
   * anything in this zone from a component that also renders on the server.
   */
  System = "system",
}
