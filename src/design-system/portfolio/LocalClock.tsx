"use client";

import React from "react";
import { STATUS } from "@/data/site";

/**
 * The clock in the status readout. The only thing on the page that is true right now.
 *
 * IT IS FORMATTED IN A FIXED ZONE, NOT THE READER'S. `Asia/Manila` is passed to Intl
 * explicitly, so this says what time it is where the work happens rather than what
 * time it is where the reader is sitting — which is the whole point of putting a clock
 * under a label that also says the timezone. A visitor in Berlin seeing their own
 * 15:47 next to "pht · gmt+8" would be reading a contradiction.
 *
 * useSyncExternalStore, and the wall clock is the external store — which is not a
 * stretch: it is a value that changes outside React, on its own schedule, that this
 * component subscribes to and samples. The obvious alternative is useState plus an
 * effect that sets it, and that is exactly the shape react-hooks/set-state-in-effect
 * exists to stop, because the first tick has to be written synchronously in the effect
 * body or the placeholder sits there for a whole second.
 *
 * It also settles the hydration question for free, and there is a real one. The server
 * could format this perfectly well — Intl with an explicit timeZone gives the same
 * answer on any machine — but it would format it at request time, and the client would
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

/** en-GB rather than the reader's locale: 24-hour, zero-padded, no AM/PM, everywhere. */
const FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: STATUS.time_zone,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

/** Same shape as the real value, so the row is the right width before the first tick. */
const PLACEHOLDER = "--:--:--";

const readClock = () => new Intl.DateTimeFormat("en-GB", FORMAT).format(new Date());

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
