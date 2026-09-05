import { DEEPCUT_LADDER, DEEPCUT_TIER_FLOOR } from "@/constants";
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
 * ONE RUNG PER ORDER OF MAGNITUDE, WHICH IS THE FORMULA.
 *
 * `docs/lab.md` left the thresholds undecided and warned against inventing five bands.
 * This is the smallest rule that is not an invention: play counts are distributed like
 * every other attention statistic, which is to say a power law spanning six or seven
 * decades, and the only scale on which such a distribution has evenly spaced steps is a
 * logarithmic one.
 *
 * So the rung is the exponent:
 *
 *     plays        exponent   rung
 *     10,000,000+     7+      chart      everyone has heard it
 *      1,000,000       6      rotation   a song that had its year
 *        100,000       5      album cut  never a single
 *         10,000       4      deep cut   thin numbers
 *     under 10,000    <4      unheard    almost nobody has played this
 *
 * WHY LINEAR BANDS WOULD NOT WORK, since that is the obvious alternative. Split zero to
 * fifty million into five equal slices and the first slice is nought to ten million,
 * which swallows very nearly every song ever recorded. Four of the five rungs would be
 * unreachable and the fifth would be everything. The distribution is the reason, not a
 * preference.
 *
 * THESE ARE STILL TUNING CONSTANTS AND THEY WILL MOVE. What is fixed is the shape - one
 * decade per rung - and what is open is where the ladder is anchored, because that
 * depends on the kind of music on the playlist. A list of Filipino indie would sit two
 * decades lower than a list of stadium rock and would come out as five unheards. When
 * there is enough real data to see that, move DEEPCUT_TIER_FLOOR; the shape stays.
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
