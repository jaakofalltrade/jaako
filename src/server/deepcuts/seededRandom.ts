/**
 * A random number generator that gives the same answers for the same seed.
 *
 * WHY A PACK RIP CANNOT USE Math.random. The rules say one pack per person per day, and
 * an unseeded draw makes that unenforceable in the way that actually matters: refresh
 * until the pull is good. Seeding on the visitor, the playlist and the day means the
 * same person opening the same pack on the same day gets the same five cards however
 * many times they reload, so the cap is a property of the draw rather than something a
 * counter has to defend.
 *
 * It also makes the draw testable. A test can assert which cards come out, which is not
 * a thing anybody can do to Math.random.
 *
 * NOT CRYPTOGRAPHIC AND NOT TRYING TO BE. This decides which songs are on a trading card,
 * and a visitor who works out the algorithm learns what they were going to be given
 * anyway. Anything from node:crypto would be slower and would still be seeded by a
 * string somebody could guess.
 *
 * Pure: same seed in, same sequence out, no clock and no global state.
 */

/**
 * Hashes a string into four 32-bit values to start the generator from.
 *
 * xmur3, which is the usual companion to mulberry32 below. A generator seeded directly
 * from a short string starts in a poor part of its state space and its first few outputs
 * correlate, which for this app would mean packs that all start with a similar card.
 */
const xmur3 = (seed: string): (() => number) => {
  let h = 1779033703 ^ seed.length;

  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
};

/**
 * The generator itself. Returns a function giving numbers in [0, 1), like Math.random.
 *
 * mulberry32: thirty-two bits of state, a handful of operations per call, and a period
 * far past anything a pack rip will ask for. The point of naming it is that it is a
 * KNOWN algorithm rather than something invented here - a hand-rolled generator that
 * looks random usually is not, and the failure is invisible until somebody notices every
 * pack has a deep cut in the third slot.
 */
export const seededRandom = (seed: string): (() => number) => {
  const next = xmur3(seed);
  let a = next();

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * The seed a pack is dealt from.
 *
 * THREE PARTS, AND EACH ONE IS DOING A JOB. The visitor so two people opening the same
 * pack get different cards; the playlist so one person's packs differ from each other;
 * the day so the whole thing resets at midnight rather than never.
 *
 * The day key is the one the suggestion cap already uses, computed in Manila time rather
 * than UTC - see getIsoDate in src/oras. A pack should reset at local midnight and not at
 * eight in the morning.
 */
export const packSeed = (args: {
  visitor_id: string;
  playlist_id: string;
  day: string;
}): string => `${args.visitor_id}:${args.playlist_id}:${args.day}`;
