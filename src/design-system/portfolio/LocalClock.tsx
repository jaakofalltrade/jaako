"use client";

import React from "react";
import { getClockTime } from "@/oras";
import { STATUS } from "@/data/site";

/**
 * The clock in the status readout. The only thing on the page that is true right now.
 *
 * IT IS FORMATTED IN A FIXED ZONE, NOT THE READER'S. Timezone.Manila is passed to
 * getClockTime explicitly, so this says what time it is where the work happens rather
 * than what time it is where the reader is sitting — which is the whole point of
 * putting a clock under a label that also says the timezone. A visitor in Berlin
 * seeing their own 15:47 next to "pht · gmt+8" would be reading a contradiction.
 *
 * This is the ONE readout on the site that deliberately ignores the visitor's zone.
 * Dates elsewhere — the suggestion list — do use it, through useTimezone; the rule is
 * that a date ABOUT the reader is theirs and a date about me is mine.
 *
 * useSyncExternalStore, and the wall clock is the external store — which is not a
 * stretch: it is a value that changes outside React, on its own schedule, that this
 * component subscribes to and samples. The obvious alternative is useState plus an
 * effect that sets it, and that is exactly the shape react-hooks/set-state-in-effect
 * exists to stop, because the first tick has to be written synchronously in the effect
 * body or the placeholder sits there for a whole second.
 *
 * It also settles the hydration question for free, and there is a real one. The server
 * could format this perfectly well — an explicit zone gives the same answer on any
 * machine — but it would format it at request time, and the client would
 * arrive a second or two later with a different seconds digit. getServerSnapshot
 * returns null instead, so the markup the server sends and the markup the client
 * hydrates are identical, and React re-renders with the live value immediately after.
 * The one place this component could produce a mismatch is the one place it refuses to
 * guess.
 *
 * getSnapshot returning a fresh string every call is safe here, and worth saying out
 * loud because it usually is not: useSyncExternalStore compares snapshots with
 * Object.is, and two equal strings are the same value. Within a given second every
 * call returns the same characters, so it compares equal and nothing re-renders. A
 * getSnapshot that returned a Date, or an object, would loop.
 */

/** Same shape as the real value, so the row is the right width before the first tick. */
const PLACEHOLDER = "--:--:--";

/* The format and the locale both live in oras now — DATE_TIME_FORMAT.clock_seconds and
   the pinned en-GB in oras/settings.ts — rather than in an Intl options object here.
   24-hour, zero-padded, no AM/PM, on every machine, exactly as before. */
const readClock = () => getClockTime.now({ timezone: STATUS.time_zone });

const clockStore = {
  subscribe: (listener: () => void) => {
    const id = setInterval(listener, 1000);
    return () => clearInterval(id);
  },
  read: readClock,
  /** null, not a formatted time. See the note above — the server is not asked to guess. */
  readServer: (): string | null => null,
};

export const LocalClock = () => {
  const time = React.useSyncExternalStore(
    clockStore.subscribe,
    clockStore.read,
    clockStore.readServer,
  );

  return (
    <span className="jk-status__clock">
      {/* aria-hidden while it is a row of dashes: "dash dash colon" announced to a
          screen reader is noise, and the value replaces it on the first client render. */}
      <span aria-hidden={time === null ? "true" : undefined}>{time ?? PLACEHOLDER}</span>
    </span>
  );
};
