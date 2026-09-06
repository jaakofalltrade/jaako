import { PACK_SIZE, SHINY_ODDS, TIER_DRAW_ODDS } from "@/constants";
import { DEEPCUT_LADDER, DeepcutTier } from "@/models";
import { resolveDrawRung } from "./rarity";

/**
 * Dealing five cards out of a playlist.
 *
 * ONE RULE, FIVE TIMES. Every card rolls its own rung against TIER_DRAW_ODDS, then a song
 * is picked uniformly from inside that rung, then a second roll decides whether it came
 * out shiny. No card is special and there is no reserved slot.
 *
 * IT WAS FOUR COMMONS AND ONE HIT SLOT, and the change is worth stating because the old
 * shape was defensible. Four cards came off the playlist uniformly and the fifth rolled a
 * rung - so four fifths of a pack was decided by the playlist's own make-up and one fifth
 * by the app. Rolling every card puts the whole pack under the app's control, and it
 * makes the mechanic one sentence instead of two.
 *
 * WHAT THAT COSTS, SAID PLAINLY: there is no longer a guarantee. The reserved slot
 * promised one card off the rarer half of the ladder in every pack; a pack can now come
 * out as five of the commonest rung. At these weights that is about one pack in a
 * thousand, and the weights are where to fix it if it ever matters.
 *
 * WITHOUT REPLACEMENT. Each draw removes its entry from the pool, so one entry cannot be
 * dealt twice. A playlist that lists the same recording under two Spotify ids has two
 * entries, and both can be drawn - a pack CAN hold the same song more than once, up to
 * all five, and that is deliberate. See packContents.
 *
 * PURE, AND THE RANDOMNESS IS AN ARGUMENT. Nothing here calls Math.random or reads a
 * clock: the caller passes a generator, which in production is seeded on the visitor, the
 * playlist and the day. That is what makes a pack stable across a refresh, and it is what
 * lets a test assert which cards come out.
 */

/** One card as it comes out of the pack. */
export type DrawnCard<T> = {
  track: T;
  tier: DeepcutTier;
  /** A second, independent roll. Only the three rarest rungs can win it. */
  shiny: boolean;
};

/** What the draw needs to know about a track. Anything else rides along on `track`. */
export type Drawable<T> = {
  track: T;
  tier: DeepcutTier;
};

/**
 * Picks one item and removes it from the pool.
 *
 * Splices rather than filters: the pool is walked once per card and rebuilding it on
 * every draw would make the caller's cost quadratic in the playlist for no gain.
 */
const take = <T>(pool: T[], random: () => number): T | undefined =>
  pool.length ? pool.splice(Math.floor(random() * pool.length), 1)[0] : undefined;

/**
 * Which rung one card rolls, before empty buckets are walked past.
 *
 * One number against the cumulative weight, read in LADDER order rather than in whatever
 * order the constant happens to be written, so the sequence a given seed produces cannot
 * change because somebody reordered an object literal.
 */
const rollRung = (random: () => number): DeepcutTier => {
  const rolled = random();
  let seen = 0;

  for (const tier of DEEPCUT_LADDER) {
    seen += TIER_DRAW_ODDS[tier];
    if (rolled < seen) return tier;
  }

  /* Only reachable if the weights do not sum to one, which is a constant being edited
     badly. The rarest rung is the safe answer: it is the one a short roll would have
     reached anyway. */
  return DEEPCUT_LADDER[DEEPCUT_LADDER.length - 1];
};

/**
 * Whether a card comes out shiny.
 *
 * A SECOND ROLL, MADE AFTER THE RUNG IS DECIDED, and only for the rungs that appear in
 * SHINY_ODDS. Shiny is a finish on a card that already has a rung rather than a rung of
 * its own, so it cannot change which song was drawn - by the time this is asked, the card
 * exists.
 *
 * `always` IS A LOOKING-AT-IT SWITCH AND NOTHING ELSE. Shiny tops out at one card in a
 * hundred on the rung that rolls it most, which means the finish is unreviewable in
 * practice. It still respects SHINY_ODDS' MEMBERSHIP - a forced pack makes ghosts and
 * losts shiny and leaves gold plain - because a shiny gold is a card that can never exist
 * and showing one would be a preview of nothing. Only the rip route can set it, and only
 * on a local deployment.
 */
const rollShiny = (args: {
  tier: DeepcutTier;
  random: () => number;
  always: boolean;
}): boolean => {
  const odds = SHINY_ODDS[args.tier];
  if (odds === undefined) return false;

  /* The roll still happens, even when forced. Skipping it would consume one fewer number
     from the generator and every card after this one would change - so a forced pack
     would not be the same pack with the finish turned on, which is the one thing it needs
     to be. */
  const rolled = args.random() < odds;
  return args.always || rolled;
};

/**
 * Deals a pack.
 *
 * Fewer eligible tracks than PACK_SIZE deals what there is, in the order drawn. A playlist
 * with three scoreable songs is a pack of three - though the shelf keeps playlists under
 * MIN_PACK_PLAYLIST_TRACKS off the page, so this is mostly reachable when last.fm matched
 * almost nothing.
 */
export const drawPack = <T>(args: {
  pool: Drawable<T>[];
  random: () => number;
  /** Local-only preview switch. See rollShiny; false everywhere that matters. */
  forceShiny?: boolean;
}): DrawnCard<T>[] => {
  const { random, forceShiny = false } = args;

  // Copied, because take() splices and the caller's array is not ours to empty.
  const pool = [...args.pool];
  const cards: DrawnCard<T>[] = [];

  for (let slot = 0; slot < PACK_SIZE && pool.length; slot += 1) {
    /* ROLL A RUNG, THEN RESOLVE IT AGAINST WHAT IS LEFT. The resolution is re-run per card
       rather than once per pack, because the pool shrinks as cards come out: a playlist
       with one ghost on it has a ghost bucket for the first card and an empty one for the
       rest, and the second roll of ghost has to fall away exactly as the first would if
       the bucket had been empty all along. */
    const rung = resolveDrawRung({
      rolled: rollRung(random),
      has: (tier) => pool.some((entry) => entry.tier === tier),
    });

    // Null only when the pool is empty, which the loop condition has already excluded.
    if (!rung) break;

    /* Filtered first so the song is of that rung by construction. take() splices the
       FILTERED array, which is a copy, so the winner is still in the real pool and has to
       be removed from it by hand or a later card can draw it again. */
    const drawn = take(
      pool.filter((entry) => entry.tier === rung),
      random
    );
    if (!drawn) break;

    pool.splice(pool.indexOf(drawn), 1);

    cards.push({
      track: drawn.track,
      tier: drawn.tier,
      shiny: rollShiny({ tier: drawn.tier, random, always: forceShiny }),
    });
  }

  return cards;
};
