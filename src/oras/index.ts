/**
 * oras — everything this codebase knows about time.
 *
 * `import { getIsoDateTimeUtc, getShortDate, Timezone } from "@/oras"`.
 *
 * ONE RULE, AND EVERY FILE HERE IS A CONSEQUENCE OF IT: a datetime is stored and
 * transported as an ISO string in UTC, and converted to a zone only at the moment it
 * is rendered. Neon holds UTC. An API response carries UTC. A model field of type
 * string is UTC. The zone is a property of the reader, not of the record, so it is
 * applied last and never written down.
 *
 * NAMING. Every entry point is `get` + the thing it hands back, so the return type is
 * legible before you open the file: getIsoDateTimeUtc returns an ISO UTC string,
 * getShortDate returns "30 aug", getMinutes returns a number of minutes. The methods
 * on each are `now` for the current instant and `from<InputType>` for a conversion,
 * where the argument is named for that same type - fromJsDate({ js_date }),
 * fromMilliseconds({ milliseconds }). Reading a call site tells you both ends of the
 * conversion without a jump to the definition.
 *
 * WHERE `timezone` APPEARS. Wherever it changes the answer, and nowhere else. It is on
 * getShortDate and getClockTime because a rendered date is a claim about somebody's
 * calendar; it is on getIsoDate.now because "today" is a different day in Manila than
 * in UTC; it is on all of getDateTime because a DateTime is always in some zone and
 * omitting the argument would hide the choice rather than remove it. It is on NONE of
 * getIsoDateTimeUtc, because every input there is an absolute instant and the output
 * zone is fixed by the name - an argument nothing reads is worse than an inconsistency,
 * it is a lie about what the function depends on.
 *
 * THE SEAM. This barrel pulls luxon. Its luxon-free half lives at "@/oras/milliseconds"
 * and MUST NOT be re-exported from here, or every module importing "@/oras" for a
 * string formatter would silently start paying the library's ~21KB for arithmetic that
 * never needed it. Read the note in ./milliseconds/index.ts before adding an export.
 *
 * useTimezone is deliberately absent too. It is a "use client" module, and folding it
 * into the barrel would drag a client boundary into the graph of every server module
 * that only wanted to format a date. Import it by path: "@/oras/useTimezone".
 */

export * from "./constants";
export * from "./getClockTime";
export * from "./getDateTime";
export * from "./getIsoDate";
export * from "./getIsoDateTimeUtc";
export * from "./getShortDate";
