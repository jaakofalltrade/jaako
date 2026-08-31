"use client";

import React from "react";
import { Timezone } from "./constants";

/**
 * The zone to render dates in, or null while there is nobody to ask.
 *
 * THE PROBLEM THIS SOLVES IS NOT "HOW DO WE READ THE VISITOR'S ZONE". Luxon does that
 * for free: Timezone.System resolves through Intl.DateTimeFormat().resolvedOptions()
 * the moment it is used in a browser, with nothing to plumb. The problem is the order
 * things happen in.
 *
 * A page is rendered TWICE - once on the server to produce HTML, once in the browser
 * when React adopts that HTML - and the two renders must produce identical text or
 * hydration fails. The server has never met the visitor, so it cannot know they are in
 * Berlin; Timezone.System on the server resolves to the HOST's zone, which is UTC on
 * Vercel. Render a date in "the system zone" from a component that also renders on the
 * server and you get UTC in the markup, Berlin in the browser, and near midnight those
 * are genuinely different days.
 *
 * So this returns null on the server and on the first client render, and the real zone
 * only once React has committed. A caller renders a placeholder for null, and the date
 * appears a frame later. That is the same trade LocalClock has always made and for the
 * identical reason: THE ONE PLACE THIS COULD PRODUCE A MISMATCH IS THE ONE PLACE IT
 * REFUSES TO GUESS.
 *
 * useSyncExternalStore rather than an effect that sets state, because that is exactly
 * the shape react-hooks/set-state-in-effect exists to stop, and because
 * getServerSnapshot is the purpose-built hook for "the server has no answer here".
 *
 * `subscribe` returns a no-op unsubscribe and never calls its listener. A visitor's
 * zone cannot change while a page is open - it takes an OS-level change - so there is
 * genuinely nothing to listen to, and inventing a subscription to look symmetric would
 * be a timer that fires forever to observe a value that never moves.
 *
 * It hands back Timezone.System rather than a resolved IANA name on purpose. The name
 * is what luxon needs to be told, not what the caller needs to know, and returning the
 * token keeps every signature in oras typed against the enum instead of widening them
 * to accept any string.
 */
const timezoneStore = {
  /** Nothing to subscribe to: see the note above. */
  subscribe: () => () => {},
  read: (): Timezone => Timezone.System,
  /** null, not a zone. The server is not asked to guess which one the visitor is in. */
  readServer: (): null => null,
};

export const useTimezone = (): Timezone | null =>
  React.useSyncExternalStore(timezoneStore.subscribe, timezoneStore.read, timezoneStore.readServer);
