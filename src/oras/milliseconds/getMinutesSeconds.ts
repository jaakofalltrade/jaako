/**
 * A span as m:ss, clamped at zero. How long a track is.
 *
 * Kept apart from getHoursMinutes rather than made a mode of it, because they answer
 * different questions. m:ss is how long a track is, which a reader compares against
 * other tracks; "3 hr 41 min" is how much listening a playlist represents, and
 * rendering that as 221:00 would be technically correct and useless.
 *
 * Plain arithmetic rather than luxon's Duration, for the reason in ../index.ts: this
 * is rendered by three client components and none of them should be paying for the
 * library to divide by sixty. Duration.toFormat would produce the same string and
 * would be the obvious choice on the server; here it is 21KB for a padStart.
 */
export const getMinutesSeconds = {
  /** "3:41". Negative and NaN clamp to "0:00" - this renders a value read off an API. */
  fromMilliseconds: (args: { milliseconds: number }): string => {
    const total = Math.max(0, Math.round(args.milliseconds / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  },
};
