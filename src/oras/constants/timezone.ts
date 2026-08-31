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
