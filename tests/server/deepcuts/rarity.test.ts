import { describe, expect, it } from "vitest";
import { DeepcutTier } from "@/models";
import { rarityOf } from "@/server/deepcuts/rarity";

/**
 * The scoring rule the whole app turns on.
 *
 * RARITY RUNS BACKWARDS: fewest plays wins. Half the tests below exist to make that
 * property impossible to break by accident, because an inverted comparison would still
 * put every track on some rung and the page would look like it was working.
 */

const tier = (plays: number | null) => rarityOf({ plays });

describe("rarityOf", () => {
  it("puts a song everybody has heard on the commonest rung", () => {
    expect(tier(20_000_000)).toBe(DeepcutTier.Diamond);
  });

  it("puts a song almost nobody has played on the rarest", () => {
    expect(tier(40)).toBe(DeepcutTier.Lost);
  });

  /* EVERY BOUNDARY, AND THE COUNT JUST UNDER IT. These are the numbers a tuning pass
     changes, so this block is what says the ladder still has eight distinct rungs in the
     right order after somebody has moved them. The floors are quantiles of a measured
     catalogue rather than round decades now - see DEEPCUT_TIER_FLOOR - which is exactly
     why they need pinning here: nothing about 30,000 is guessable. */
  it("lands each band on its own rung", () => {
    expect(tier(15_000_000)).toBe(DeepcutTier.Diamond);
    expect(tier(14_999_999)).toBe(DeepcutTier.Platinum);
    expect(tier(4_000_000)).toBe(DeepcutTier.Platinum);
    expect(tier(3_999_999)).toBe(DeepcutTier.Gold);
    expect(tier(1_000_000)).toBe(DeepcutTier.Gold);
    expect(tier(999_999)).toBe(DeepcutTier.Silver);
    expect(tier(300_000)).toBe(DeepcutTier.Silver);
    expect(tier(299_999)).toBe(DeepcutTier.Deepcut);
    expect(tier(80_000)).toBe(DeepcutTier.Deepcut);
    expect(tier(79_999)).toBe(DeepcutTier.Unheard);
    expect(tier(20_000)).toBe(DeepcutTier.Unheard);
    expect(tier(19_999)).toBe(DeepcutTier.Ghost);
    expect(tier(5_000)).toBe(DeepcutTier.Ghost);
    expect(tier(4_999)).toBe(DeepcutTier.Lost);
  });

  /* THE FAILURE THE RE-ANCHORING FIXED, kept as a test because it is invisible without
     one. An early ladder floored its commonest rung at 500m while the account's entire
     catalogue tops out at 46.7m, so the top two rungs were printed in the legend and
     could not be reached by any song on it. A rung nothing can land on is not a rung, and
     the only way to notice is to ask whether a plausible count reaches the top. */
  it("puts the loudest song on the account on the commonest rung", () => {
    expect(tier(46_744_930)).toBe(DeepcutTier.Diamond);
  });

  /* Zero is a real answer, not a missing one: Last.fm knows the track and nobody has
     scrobbled it, which is the genuine top of the ladder. */
  it("treats a real zero as the rarest rung", () => {
    expect(tier(0)).toBe(DeepcutTier.Lost);
  });

  /* NULL IS NOT A ZERO AND MUST NEVER BECOME ONE. Last.fm matches on artist and title,
     so an unmatched track has no count at all. Defaulting it to unheard would make
     every failure to match look like the rarest thing in the app, which is the single
     most misleading bug this function could have. */
  it("has no answer for a track that could not be matched", () => {
    expect(tier(null)).toBeNull();
    expect(rarityOf({ plays: undefined })).toBeNull();
  });

  it("refuses a broken count rather than scoring it", () => {
    expect(tier(-1)).toBeNull();
    expect(tier(Number.NaN)).toBeNull();
    expect(tier(Number.POSITIVE_INFINITY)).toBeNull();
  });

  /* THE INVERSION, STATED AS A PROPERTY. Walking up through the play counts must never
     move a track to a RARER rung. An accidental `<=` for a `>=`, or a ladder read the
     wrong way round, fails here and passes most of the tests above. */
  it("never gets rarer as the play count grows", () => {
    const ladderIndex = [
      DeepcutTier.Lost,
      DeepcutTier.Ghost,
      DeepcutTier.Unheard,
      DeepcutTier.Deepcut,
      DeepcutTier.Silver,
      DeepcutTier.Gold,
      DeepcutTier.Platinum,
      DeepcutTier.Diamond,
    ];

    /* ladderIndex runs rarest first, so a bigger rank is a COMMONER rung. More plays
       must therefore never lower the rank. */
    let previous = -1;

    for (const plays of [0, 1, 4_999, 5_000, 19_999, 20_000, 79_999, 80_000, 299_999, 300_000, 999_999, 1_000_000, 3_999_999, 4_000_000, 14_999_999, 15_000_000, 46_744_930]) {
      const rung = tier(plays);
      const rank = ladderIndex.indexOf(rung!);

      expect(rank, `${plays} plays`).toBeGreaterThanOrEqual(previous);
      previous = rank;
    }
  });

  it("always returns a rung for any real count", () => {
    for (const plays of [0, 3, 99, 999, 12_345, 678_900, 4_200_000, 88_000_000, 300_000_000]) {
      expect(tier(plays), `${plays} plays`).not.toBeNull();
    }
  });
});
