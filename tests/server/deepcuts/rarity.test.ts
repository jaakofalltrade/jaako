import { describe, expect, it } from "vitest";
import { DeepcutTier } from "@/models";
import { pullChance, rarityOf } from "@/server/deepcuts/rarity";

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

describe("pullChance", () => {
  const many = (tier: DeepcutTier, count: number) => Array.from({ length: count }, () => tier);

  it("has no answer for a track with no rung", () => {
    expect(pullChance({ tier: null, among: many(DeepcutTier.Platinum, 20) })).toBeNull();
  });

  it("has no answer when nothing is eligible", () => {
    expect(pullChance({ tier: DeepcutTier.Platinum, among: [] })).toBeNull();
  });

  /* THE DIRECTION THE NUMBER RUNS, AND IT REVERSED WHEN THE HIT SLOT WENT. This prices
     "will my pack hold this song", and a rare song is one the draw rolls for less often -
     so a rarer rung on an equal footing is LESS likely, not more. Under the old four
     commons and one hit, the figure priced the hit slot alone and a rare rung scored
     higher, which is the opposite reading of the same column. Twenty songs on every rung,
     so bucket size cannot muddy it - and a pool far bigger than a pack, or a five card
     draw from six songs prices nearly all of them at 100% and shows nothing. */
  it("is less likely to deal a rarer rung, all else equal", () => {
    const rungs = [
      DeepcutTier.Platinum,
      DeepcutTier.Silver,
      DeepcutTier.Deepcut,
      DeepcutTier.Unheard,
      DeepcutTier.Ghost,
      DeepcutTier.Lost,
    ];
    const among = rungs.flatMap((tier) => many(tier, 20));

    const chances = rungs.map((tier) => pullChance({ tier, among })!);

    for (let i = 1; i < chances.length; i += 1) {
      expect(chances[i], rungs[i]).toBeLessThan(chances[i - 1]);
    }
  });

  /* AND BUCKET SIZE CAN OUT-WEIGH RARITY, which is worth pinning because it looks like a
     bug the first time you see it. One lost among forty platinums prices BELOW any one of
     those platinums: the platinum rung carries 22% of its own plus the 24% that falls
     down from an empty diamond rung, and 46% shared forty ways still beats 1% shared one
     way. Nothing is wrong - a specific song on a crowded playlist is a specific song. */
  it("lets a fat common rung out-price a thin rare one", () => {
    const among = [
      ...many(DeepcutTier.Platinum, 40),
      ...many(DeepcutTier.Silver, 20),
      ...many(DeepcutTier.Lost, 1),
    ];

    expect(pullChance({ tier: DeepcutTier.Platinum, among })!).toBeGreaterThan(
      pullChance({ tier: DeepcutTier.Lost, among })!
    );
  });

  /* IT PRICES THE SONG, NOT THE PLAYLIST'S LENGTH. A lone ghost is a lone ghost whether
     it sits among eleven songs or among two hundred and eighty: its rung's weight is
     fixed and it is the only thing on that rung either way. An earlier version added the
     four uniform common slots into this number, which put a floor of 4/(pool - 1) under
     every row - 36.4% on a twelve-track list - and made the figure track playlist length
     instead of rarity. */
  it("prices a lone ghost the same on a short playlist and a long one", () => {
    const short = [
      ...many(DeepcutTier.Silver, 7),
      ...many(DeepcutTier.Deepcut, 3),
      ...many(DeepcutTier.Ghost, 1),
    ];
    const long = [
      ...many(DeepcutTier.Silver, 275),
      ...many(DeepcutTier.Deepcut, 3),
      ...many(DeepcutTier.Ghost, 1),
    ];

    expect(pullChance({ tier: DeepcutTier.Ghost, among: short })).toBe(
      pullChance({ tier: DeepcutTier.Ghost, among: long })
    );
  });

  /* Rarity beats bucket size on the same playlist, which is the sentence the column is
     there to make: one ghost out of one is a better card to hold than one of twenty-one
     deep cuts. */
  it("prices a lone ghost above one of several deep cuts", () => {
    const among = [
      ...many(DeepcutTier.Silver, 9),
      ...many(DeepcutTier.Deepcut, 21),
      ...many(DeepcutTier.Ghost, 1),
    ];

    expect(pullChance({ tier: DeepcutTier.Ghost, among })!).toBeGreaterThan(
      pullChance({ tier: DeepcutTier.Deepcut, among })!
    );
  });

  /* A rung shares its weight between the songs on it, so crowding a rung makes every song
     on it worse. Not exactly halved: as a rung empties mid-pack its remaining songs get
     dearer, which is the whole reason this is enumerated rather than raised to a power. */
  it("makes every song on a rung worse as the rung fills up", () => {
    const few = [...many(DeepcutTier.Silver, 10), ...many(DeepcutTier.Deepcut, 2)];
    const several = [...many(DeepcutTier.Silver, 10), ...many(DeepcutTier.Deepcut, 8)];

    expect(pullChance({ tier: DeepcutTier.Deepcut, among: few })!).toBeGreaterThan(
      pullChance({ tier: DeepcutTier.Deepcut, among: several })!
    );
  });

  /* A rung with nothing on it cannot be drawn, so it prices at zero rather than at null.
     Null is reserved for a question that cannot be asked - a track with no rung at all. */
  it("prices a rung the playlist does not have at zero", () => {
    const among = many(DeepcutTier.Silver, 20);

    expect(pullChance({ tier: DeepcutTier.Lost, among })).toBe(0);
    expect(pullChance({ tier: DeepcutTier.Silver, among })!).toBeGreaterThan(0);
  });

  /* An empty bucket walks DOWN to the nearest rung that has a song, never up unless there
     is nothing below at all. With no lost songs, that weight lands on the ghosts. */
  it("walks an empty bucket down the ladder rather than up", () => {
    const withRare = [
      ...many(DeepcutTier.Silver, 30),
      ...many(DeepcutTier.Ghost, 5),
      ...many(DeepcutTier.Lost, 5),
    ];
    const withoutRare = [
      ...many(DeepcutTier.Silver, 30),
      ...many(DeepcutTier.Ghost, 5),
      ...many(DeepcutTier.Platinum, 5),
    ];

    expect(pullChance({ tier: DeepcutTier.Ghost, among: withoutRare })!).toBeGreaterThan(
      pullChance({ tier: DeepcutTier.Ghost, among: withRare })!
    );
  });

  /* A playlist of one song deals a pack of one, and that song is in it. */
  it("never exceeds a hundred percent", () => {
    expect(pullChance({ tier: DeepcutTier.Lost, among: many(DeepcutTier.Lost, 1) })).toBe(100);

    const among = [...many(DeepcutTier.Lost, 1), ...many(DeepcutTier.Platinum, 5)];
    const value = pullChance({ tier: DeepcutTier.Lost, among })!;
    expect(value).toBeLessThanOrEqual(100);
    expect(value).toBeGreaterThan(0);
  });

  /* THE INVARIANT THAT CAUGHT THE FIRST VERSION. A pack is five cards, so the chances
     across every song on the playlist must add up to five of them - 500%. The independent
     approximation this replaced summed to 432% on the same pool, which is how the error
     was found: it was not slightly wrong, it was a fifth of a pack short. */
  it("adds up to five cards across the whole playlist", () => {
    const among = [
      ...many(DeepcutTier.Silver, 9),
      ...many(DeepcutTier.Deepcut, 21),
      ...many(DeepcutTier.Unheard, 15),
      ...many(DeepcutTier.Ghost, 2),
    ];

    const total = among.reduce((sum, tier) => sum + pullChance({ tier, among })!, 0);

    /* Within three points rather than exact: each rung is rounded to one decimal before
       it is counted once per song on it, so forty-seven songs carry up to a couple of
       points of rounding between them. The approximation this replaced was sixty-eight
       points out, which no tolerance would have hidden. */
    expect(total).toBeGreaterThan(497);
    expect(total).toBeLessThan(503);
  });

  /* And it still adds up when the pool is barely bigger than the pack, which is where the
     approximation was furthest out. */
  it("adds up to what a short playlist can actually deal", () => {
    const among = [...many(DeepcutTier.Silver, 4), ...many(DeepcutTier.Ghost, 2)];

    const total = among.reduce((sum, tier) => sum + pullChance({ tier, among })!, 0);

    expect(total).toBeGreaterThan(497);
    expect(total).toBeLessThan(503);
  });
});
