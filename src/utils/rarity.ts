import { DEEPCUT_LADDER, DEEPCUT_TIER_FLOOR, HIT_SLOT_ODDS } from "@/constants";
import { DeepcutTier } from "@/models";

/**
 * How rare a card is, from how few people have played the song.
 *
 * Pure and dependency-free. Where the number comes from is somebody else's problem -
 * server/lastfm/ fetches it - and that separation is what lets the rule below be
 * argued about, tuned and tested without a network in the room.
 *
 * RARITY RUNS BACKWARDS AND THAT IS THE WHOLE APP. Fewest plays wins. A chart hit is
 * the common you throw back and a track nobody has scrobbled is the pull. Everything
 * below reads upside down if you forget that.
 */

/**
 * THE RUNGS ARE QUANTILES OF A MEASURED CATALOGUE, AND THEY DID NOT START THAT WAY.
 *
 * `docs/lab.md` left the thresholds undecided and warned against inventing five bands,
 * so the first rule here was the smallest one that was not an invention: one rung per
 * order of magnitude. Play counts are a power law like every other attention statistic,
 * and a logarithmic ladder is the only one whose steps are evenly spaced against one.
 * Linear bands are certainly wrong - split zero to fifty million into eight equal slices
 * and the first swallows very nearly every song ever recorded.
 *
 * WHAT THAT RULE MISSED IS THE RANGE. Eight rungs a decade apart need seven decades to
 * fill. `pnpm ladder:spread` measured 1,097 matched tracks across 60 playlists and found
 * the catalogue spans about four, from a p5 of 8.8k scrobbles to a maximum of 46.7m -
 * because these are LAST.FM SCROBBLES, a sampled fraction of the streams a song actually
 * has, and Spotify publishes no counts to calibrate against. Two rungs, `chart` and
 * `anthem`, floored above anything that exists on the account. They were printed in the
 * legend, weighted in the hit slot, and dealt to nobody, ever.
 *
 * So the floors are chosen by SHARE instead: each one a quantile of that distribution,
 * rounded to a number a legend can print, so the rungs fall away the way a card set does
 * - 28.8% anthem down to 0.6% lost, monotonically, with nothing empty. The table is in
 * DEEPCUT_TIER_FLOOR beside the numbers.
 *
 * WHAT THAT GIVES UP, said plainly: "one rung per order of magnitude" is a sentence
 * anybody can check against a play count, and "the 71st percentile of one person's
 * playlists" is not. The floors are still round numbers and the ladder is still
 * monotonic, so nothing a reader does with it changes; what changes is that the rule
 * behind them is now empirical, which means it is only as good as the sample. Re-run the
 * script before moving them.
 */

/**
 * The rung a play count lands on.
 *
 * NULL FOR AN UNKNOWN COUNT, AND THAT IS THE HONEST ANSWER RATHER THAN A DEFAULT.
 * Last.fm matches on artist and title, so a track it has never heard of, or one it
 * knows under a different spelling, comes back with nothing. docs/lab.md settles what
 * to do about it: a track that cannot be matched has no tier and is left out of the
 * pack rather than being guessed at. Defaulting an unmatched track to `unheard` would
 * be the worst possible guess, because it would make every failure to match look like
 * the rarest thing in the app.
 *
 * A count of zero is NOT unknown. It means Last.fm knows the track and nobody has
 * scrobbled it, which is the genuine top of the ladder.
 */
export const rarityOf = (args: { plays: number | null | undefined }): DeepcutTier | null => {
  const { plays } = args;

  if (plays === null || plays === undefined) return null;
  // A negative count is not a quiet track, it is a broken response.
  if (!Number.isFinite(plays) || plays < 0) return null;

  /* HIGHEST FLOOR FIRST, taking the first one the count clears, which is DEEPCUT_LADDER
     in its declared order: it runs commonest to rarest and the floors run downward with
     it, ten million to zero.

     Reversing it here is the mistake to avoid, and it is a tempting one, because the
     app thinks rarest-first everywhere else. Walked that way, `unheard` comes first, its
     floor is zero, and every count on earth clears it - so every card is a pull and the
     ladder never gets consulted again. */
  for (const tier of DEEPCUT_LADDER) {
    if (plays >= DEEPCUT_TIER_FLOOR[tier]) return tier;
  }

  /* Unreachable while the unheard floor is 0, and here rather than as a bare
     `?? DeepcutTier.Unheard` so that raising that floor cannot silently drop a track on
     the ground. */
  return DeepcutTier.Unheard;
};

/**
 * Which rung the hit slot settles on, given the rung it rolled and what the pool holds.
 *
 * ONE RULE, TWO CALLERS. drawPack deals the card and pullChance prices it, and if they
 * disagree the printed odds are for a draw that does not happen. It lives here because
 * this module is the pure one.
 *
 * DOWN FIRST, WHICH IS THE RULE THAT MATTERS. DEEPCUT_LADDER runs commonest first, so
 * walking down is walking toward index zero. Roll `lost` on a playlist with no lost
 * tracks and the slot falls to ghost, then unheard, and so on. Falling upward by
 * preference would hand out rarer cards than the playlist has earned, which is the one
 * direction that makes the ladder meaningless.
 *
 * UP ONLY WHEN THERE IS NOTHING BELOW AT ALL, and that clause is not a nicety. Without
 * it, a playlist whose commonest song is a deep cut loses its hit slot to every roll of
 * `album` - 46% of them - and drawPack, having no hit to append, deals FOUR cards
 * instead of five. Measured at 92 short packs in 200 before this existed. Falling up
 * here cannot hand out an unearned rarity, because reaching it means the playlist has
 * nothing commoner to give.
 *
 * Null only when the pool is empty, which is the one case with no answer.
 */
export const resolveHitRung = (args: {
  rolled: DeepcutTier;
  /** Whether the pool holds a track on a given rung. */
  has: (tier: DeepcutTier) => boolean;
}): DeepcutTier | null => {
  const { rolled, has } = args;
  const start = DEEPCUT_LADDER.indexOf(rolled);

  for (let index = start; index >= 0; index -= 1) {
    if (has(DEEPCUT_LADDER[index])) return DEEPCUT_LADDER[index];
  }

  for (let index = start + 1; index < DEEPCUT_LADDER.length; index += 1) {
    if (has(DEEPCUT_LADDER[index])) return DEEPCUT_LADDER[index];
  }

  return null;
};

/**
 * The chance this song is the pack's PULL, as a percentage.
 *
 * WHAT THIS ANSWERS, AND WHAT IT DELIBERATELY DOES NOT. A pack is COMMON_SLOTS cards
 * drawn uniformly plus one hit slot that rolls a rung by HIT_SLOT_ODDS and then picks
 * uniformly inside it. This prices the hit slot alone: of all the packs this playlist
 * could deal, in what fraction is this exact track the rare card?
 *
 * IT USED TO INCLUDE THE COMMONS AND THAT MADE IT USELESS. Adding "or the commons found
 * it" puts a floor of COMMON_SLOTS/(pool - 1) under every row, and on a short playlist
 * that floor IS the number: twelve scored tracks put every song on the list at 36.4%
 * before its rung was consulted at all, so a ghost read 40.8% and a deep cut 46.3% and
 * the column carried no rarity signal whatever. The floor also moved with playlist
 * length rather than with the song, which meant the same ghost was priced 40.8% on a
 * twelve-track list and 8.3% on a long one.
 *
 * Dropping the commons term is what makes the figure a rarity again. It depends on the
 * rung's weight and on how many tracks share that rung, and on nothing else, so a lone
 * ghost beats one of twenty deep cuts on any playlist of any size.
 *
 * ZERO IS A REAL ANSWER AND NOT A MISSING ONE. The hit slot never rolls above album cut,
 * so on a playlist that has album cuts, a rotation or chart track cannot be the pull -
 * it can only arrive as a common. That reads as 0 here and prints as "common only". It
 * is per playlist rather than per rung: strip the album cuts out and that weight falls
 * down the ladder onto rotation, which then has a real chance. Null is reserved for a
 * question that cannot be asked at all.
 *
 * ELIGIBLE MEANS SCORED. Tracks last.fm could not match have no rung and are not in the
 * pool, so they are not in the denominator either - the same rule that keeps them out of
 * a pack keeps them out of everyone else's odds.
 */
export const pullChance = (args: {
  tier: DeepcutTier | null;
  /** The rung of every eligible track on the playlist, this one included. */
  among: DeepcutTier[];
}): number | null => {
  const { tier, among } = args;

  // No rung, no pool place, no odds. The three go together; see rarityOf.
  if (!tier) return null;
  if (among.length === 0) return null;

  const counts = new Map<DeepcutTier, number>();
  for (const rung of among) counts.set(rung, (counts.get(rung) ?? 0) + 1);

  // Where the hit slot actually resolves, once empty buckets have been walked past.
  const landed = new Map<DeepcutTier, number>();

  const has = (rung: DeepcutTier) => (counts.get(rung) ?? 0) > 0;

  for (const [rolled, weight] of Object.entries(HIT_SLOT_ODDS)) {
    if (!weight) continue;

    /* The same resolution drawPack uses, so every point of weight is accounted for and
       the column adds up to the one card the hit slot deals. */
    const rung = resolveHitRung({ rolled: rolled as DeepcutTier, has });
    if (rung) landed.set(rung, (landed.get(rung) ?? 0) + weight);
  }

  /* The rung's whole weight, shared evenly by the tracks on it, because the hit slot
     picks uniformly once it has chosen a rung. A caller asking about a track that is not
     in `among` gets zero rather than a divide by zero. */
  const inRung = counts.get(tier) ?? 0;
  const chance = inRung > 0 ? (landed.get(tier) ?? 0) / inRung : 0;

  // One decimal: the spread across a big playlist lives in the tenths.
  return Math.round(Math.min(chance, 1) * 1000) / 10;
};
