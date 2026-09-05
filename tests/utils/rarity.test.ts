import { describe, expect, it } from "vitest";
import { DeepcutTier } from "@/models";
import { rarityOf } from "@/utils/rarity";

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
    expect(tier(48_000_000)).toBe(DeepcutTier.Chart);
  });

  it("puts a song almost nobody has played on the rarest", () => {
    expect(tier(600)).toBe(DeepcutTier.Unheard);
  });

  /* One rung per order of magnitude, checked on each boundary and just under it. These
     are the numbers a tuning pass will change, so this block is what tells you the
     shape still holds after you have changed them. */
  it("lands each decade on its own rung", () => {
    expect(tier(10_000_000)).toBe(DeepcutTier.Chart);
    expect(tier(9_999_999)).toBe(DeepcutTier.Rotation);
    expect(tier(1_000_000)).toBe(DeepcutTier.Rotation);
    expect(tier(999_999)).toBe(DeepcutTier.Album);
    expect(tier(100_000)).toBe(DeepcutTier.Album);
    expect(tier(99_999)).toBe(DeepcutTier.Deepcut);
    expect(tier(10_000)).toBe(DeepcutTier.Deepcut);
    expect(tier(9_999)).toBe(DeepcutTier.Unheard);
  });

  /* Zero is a real answer, not a missing one: Last.fm knows the track and nobody has
     scrobbled it, which is the genuine top of the ladder. */
  it("treats a real zero as the rarest rung", () => {
    expect(tier(0)).toBe(DeepcutTier.Unheard);
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
      DeepcutTier.Unheard,
      DeepcutTier.Deepcut,
      DeepcutTier.Album,
      DeepcutTier.Rotation,
      DeepcutTier.Chart,
    ];

    /* ladderIndex runs rarest first, so a bigger rank is a COMMONER rung. More plays
       must therefore never lower the rank. */
    let previous = -1;

    for (const plays of [0, 1, 500, 9_999, 10_000, 50_000, 100_000, 750_000, 1_000_000, 5_000_000, 10_000_000, 90_000_000]) {
      const rung = tier(plays);
      const rank = ladderIndex.indexOf(rung!);

      expect(rank, `${plays} plays`).toBeGreaterThanOrEqual(previous);
      previous = rank;
    }
  });

  it("always returns a rung for any real count", () => {
    for (const plays of [0, 3, 999, 12_345, 678_900, 4_200_000, 88_000_000]) {
      expect(tier(plays), `${plays} plays`).not.toBeNull();
    }
  });
});
