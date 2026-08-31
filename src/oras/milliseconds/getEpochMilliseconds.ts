/**
 * Milliseconds since the epoch. The one clock reading in the codebase.
 *
 * A wrapper around Date.now(), and a thin one deliberately - it adds no behaviour and
 * is not trying to. What it adds is a NAME and an ADDRESS: every expiry check, every
 * cache sweep and every elapsed-time measurement now reads its clock from inside oras,
 * so "where does this app get the time" has one answer instead of nine call sites
 * spread across the server and the browser.
 *
 * NO LUXON HERE, AND THAT IS THE POINT OF THIS FOLDER. An expiry comparison is
 * arithmetic on two numbers; routing it through DateTime would cost the ~21KB the
 * library weighs, in a bundle it does not otherwise need to be in, to answer a
 * question subtraction already answers. See ../index.ts for the seam.
 *
 * It stays fakeable regardless: luxon's Settings.now defaults to Date.now, so
 * vi.setSystemTime moves this and the luxon half of oras from the same call.
 *
 * `now` takes no timezone because an instant does not have one. A zone is a way of
 * WRITING DOWN an instant, and this hands back a number that is never written down.
 */
export const getEpochMilliseconds = {
  /** Right now, as a number to subtract from another one. */
  now: (): number => Date.now(),
};
