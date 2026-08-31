import "./settings";
import { DATE_TIME_FORMAT, Timezone } from "./constants";
import { getDateTime } from "./getDateTime";

/**
 * The wall clock as "14:07:23". What the status strip reads.
 *
 * `now` takes a timezone for the same reason getIsoDate's does and getIsoDateTimeUtc's
 * does not: nothing in the name fixes the answer, so a clock with no zone is not a
 * simpler clock, it is an unanswered question. The status strip passes Timezone.Manila
 * explicitly, because the label underneath it says "pht · gmt+8" and a clock reading
 * anything else under that label would be a contradiction printed on the page.
 *
 * 24-hour and zero-padded on every machine - see DATE_TIME_FORMAT.clock_seconds and
 * the pinned locale in ./settings.ts, which together are what stop this from becoming
 * "2:07:23 PM" for a reader in the United States.
 */
export const getClockTime = {
  /** The time right now, on `timezone`'s clock. */
  now: (args: { timezone: Timezone }): string =>
    getDateTime.now({ timezone: args.timezone }).toFormat(DATE_TIME_FORMAT.clock_seconds),
};
