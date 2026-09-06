import {
  COMMON_SLOTS,
  DEEPCUT_LADDER,
  HIT_SLOT_ODDS,
  PACK_SIZE,
  SHINY_ODDS,
} from "@/constants";
import { DeepcutTier } from "@/models";
import { resolveHitRung } from "@/utils/rarity";

/**
 * Dealing five cards out of a playlist.
 *
 * FOUR COMMONS AND ONE HIT SLOT. Four cards come off the playlist uniformly and are
 * whatever they are; the fifth rolls against fixed odds for something good. That shape
 * is the whole design and the argument for it is in the pack-odds write-up: five uniform
 * draws make the odds a property of the PLAYLIST rather than of the app, so ripping a
 * list of obscurities makes every card a pull and the rare rungs worthless exactly where
 * they should mean most.
 *
 * PURE, AND THE RANDOMNESS IS AN ARGUMENT. Nothing here calls Math.random or reads a
 * clock: the caller passes a generator, which in production is seeded on the visitor,
 * the playlist and the day. That is what makes a pack stable across a refresh, and it is
 * what lets a test assert which cards come out.
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
 * Picks one item and removes it from the pool, so a pack never repeats a song.
 *
 * Splices rather than filters: the pool is walked several times and rebuilding it on
 * every draw would make the caller's cost quadratic in the playlist for no gain.
 */
const take = <T>(pool: T[], random: () => number): T | undefined =>
  pool.length ? pool.splice(Math.floor(random() * pool.length), 1)[0] : undefined;

/**
 * Which rung the hit slot lands on, once empty buckets have been walked past.
 *
 * THE ROLL IS HERE, THE RESOLUTION IS IN rarity.ts. resolveHitRung holds the down-then-up
 * walk because pullChance has to price exactly the draw this makes; a copy of that rule
 * here is a copy that can drift, and the symptom would be printed odds for a pack nobody
 * is dealt.
 *
 * Null only on an empty pool.
 */
const hitRung = <T>(args: {
  pool: Drawable<T>[];
  random: () => number;
}): DeepcutTier | null => {
  const { pool, random } = args;

  /* One roll across the whole table, resolved by walking the cumulative weight. The
     entries are read in ladder order rather than object order so the sequence a given
     seed produces does not depend on how the constant happens to be written. */
  const rolled = random();
  let seen = 0;
  let target: DeepcutTier | null = null;

  for (const tier of DEEPCUT_LADDER) {
    const weight = HIT_SLOT_ODDS[tier];
    if (!weight) continue;

    seen += weight;
    if (rolled < seen) {
      target = tier;
      break;
    }
  }

  // Only reachable if the odds do not sum to one, which is a constant being edited badly.
  if (!target) target = DEEPCUT_LADDER[DEEPCUT_LADDER.length - 1];

  return resolveHitRung({
    rolled: target,
    has: (tier) => pool.some((entry) => entry.tier === tier),
  });
};

/**
 * Whether a card comes out shiny.
 *
 * A SECOND ROLL, MADE AFTER THE RUNG IS DECIDED, and only for the rungs that appear in
 * SHINY_ODDS. Shiny is a finish on a card that already has a rung rather than a rung of
 * its own, so it cannot change which song was drawn - by the time this is asked, the
 * card exists.
 */
const rollShiny = (args: { tier: DeepcutTier; random: () => number }): boolean => {
  const odds = SHINY_ODDS[args.tier];
  return odds !== undefined && args.random() < odds;
};

/**
 * Deals a pack.
 *
 * Fewer than PACK_SIZE eligible tracks deals what there is, in the order drawn. A
 * playlist with three songs is a pack of three, which is a real state the shelf already
 * shows: several playlists on the account have one or two.
 *
 * THE HIT IS DRAWN FIRST AND SITS LAST. Drawing it first is what lets it claim its rung
 * before the commons have taken songs out of the pool; putting it at the end is so a
 * reader turning cards over reaches it last, which is the only reason a hit slot is worth
 * having a position at all.
 */
export const drawPack = <T>(args: {
  pool: Drawable<T>[];
  random: () => number;
}): DrawnCard<T>[] => {
  const { random } = args;

  // Copied, because take() splices and the caller's array is not ours to empty.
  const pool = [...args.pool];
  if (pool.length === 0) return [];

  const cards: DrawnCard<T>[] = [];

  const rung = hitRung({ pool, random });
  const hit = rung
    ? take(
        // Only the bucket, so the hit is a card of that rung by construction.
        pool.filter((entry) => entry.tier === rung),
        random
      )
    : undefined;

  /* take() spliced the FILTERED array, which is a copy, so the winner is still in the
     real pool and has to be removed from it by hand or the commons can draw it again. */
  if (hit) pool.splice(pool.indexOf(hit), 1);

  for (let slot = 0; slot < COMMON_SLOTS && pool.length; slot += 1) {
    const drawn = take(pool, random);
    if (drawn) {
      cards.push({
        track: drawn.track,
        tier: drawn.tier,
        shiny: rollShiny({ tier: drawn.tier, random }),
      });
    }
  }

  if (hit) {
    cards.push({
      track: hit.track,
      tier: hit.tier,
      shiny: rollShiny({ tier: hit.tier, random }),
    });
  }

  return cards.slice(0, PACK_SIZE);
};
