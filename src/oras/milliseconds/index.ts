/**
 * The luxon-free half of oras. `import { getMinutesSeconds } from "@/oras/milliseconds"`.
 *
 * Everything in here takes or returns a plain number of milliseconds, and NOTHING IN
 * HERE IMPORTS LUXON. That is a guarantee this barrel makes to its callers, not a
 * coincidence of how the files happen to be written today, and it is the reason the
 * folder is a folder rather than four files sitting beside getDateTime.
 *
 * WHY THE GUARANTEE IS WORTH A DIRECTORY. Luxon costs about 21KB gzipped and does not
 * meaningfully tree-shake - importing DateTime alone measures the same as importing
 * DateTime, Duration, Interval, Info and Settings together, because DateTime pulls the
 * formatter, the locale machinery and the zone implementations behind it. Three client
 * components here do nothing but subtract two numbers and pad a string: NowPlayingDock
 * counting elapsed time, DecryptedText scheduling a replay, and the rows rendering a
 * track length. Making them import from this path keeps the library out of their way.
 *
 * THE SEAM ONLY HOLDS IF NOBODY BRIDGES IT. ../index.ts must never re-export this
 * barrel and this barrel must never re-export ../index.ts, because a single line doing
 * so would quietly put luxon back into every module that imports either one, and
 * nothing would fail - the bundle would just grow and no test would notice. Two import
 * paths is the enforcement mechanism.
 */

export * from "./getEpochMilliseconds";
export * from "./getHoursMinutes";
export * from "./getMinutes";
export * from "./getMinutesSeconds";
