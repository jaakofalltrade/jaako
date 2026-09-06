import { describe, expect, it } from "vitest";
import { DeepcutTier } from "@/models";
import { pullChance, rarityOf } from "@/utils/rarity";

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
    expect(tier(900_000_000)).toBe(DeepcutTier.Anthem);
  });

  it("puts a song almost nobody has played on the rarest", () => {
    expect(tier(40)).toBe(DeepcutTier.Lost);
  });

  /* One rung per order of magnitude, checked on each boundary and just under it. These
     are the numbers a tuning pass will change, so this block is what tells you the
     shape still holds after you have changed them. */
  /* Anthem is the one half-step, at 500m rather than a billion: a billion scrobbles is a
     handful of songs in history and a rung nothing lands on is not a rung. */
  it("lands each decade on its own rung", () => {
    expect(tier(500_000_000)).toBe(DeepcutTier.Anthem);
    expect(tier(499_999_999)).toBe(DeepcutTier.Chart);
    expect(tier(100_000_000)).toBe(DeepcutTier.Chart);
    expect(tier(99_999_999)).toBe(DeepcutTier.Rotation);
    expect(tier(10_000_000)).toBe(DeepcutTier.Rotation);
    expect(tier(9_999_999)).toBe(DeepcutTier.Album);
    expect(tier(1_000_000)).toBe(DeepcutTier.Album);
    expect(tier(999_999)).toBe(DeepcutTier.Deepcut);
    expect(tier(100_000)).toBe(DeepcutTier.Deepcut);
    expect(tier(99_999)).toBe(DeepcutTier.Unheard);
    expect(tier(10_000)).toBe(DeepcutTier.Unheard);
    expect(tier(9_999)).toBe(DeepcutTier.Ghost);
    expect(tier(1_000)).toBe(DeepcutTier.Ghost);
    expect(tier(999)).toBe(DeepcutTier.Lost);
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
      DeepcutTier.Album,
      DeepcutTier.Rotation,
      DeepcutTier.Chart,
      DeepcutTier.Anthem,
    ];

    /* ladderIndex runs rarest first, so a bigger rank is a COMMONER rung. More plays
       must therefore never lower the rank. */
    let previous = -1;

    for (const plays of [0, 1, 999, 1_000, 9_999, 10_000, 99_999, 100_000, 999_999, 1_000_000, 9_999_999, 10_000_000, 99_999_999, 100_000_000, 499_999_999, 500_000_000, 900_000_000]) {
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
    expect(pullChance({ tier: null, among: many(DeepcutTier.Chart, 20) })).toBeNull();
  });

  it("has no answer when nothing is eligible", () => {
    expect(pullChance({ tier: DeepcutTier.Chart, among: [] })).toBeNull();
  });

  /* THE PROPERTY THE WHOLE FIGURE EXISTS FOR. The hit slot never rolls a common rung, so
     a rare song in a thin bucket has to beat a common one. A uniform draw would price
     them identically and there would be no reason to print the number. */
  it("prices a rare song above a common one on the same playlist", () => {
    const among = [
      ...many(DeepcutTier.Chart, 40),
      ...many(DeepcutTier.Album, 20),
      ...many(DeepcutTier.Lost, 1),
    ];

    const common = pullChance({ tier: DeepcutTier.Chart, among })!;
    const rare = pullChance({ tier: DeepcutTier.Lost, among })!;

    expect(rare).toBeGreaterThan(common);
  });

  /* THE REASON THE COMMONS CAME OUT OF THIS FIGURE, pinned as arithmetic rather than as
     a comment. The old number added "or one of the four uniform slots found it", which
     put a floor of 4/(pool - 1) under every row: on a twelve-track playlist that floor
     was 36.4% and it swamped the rung, so a ghost priced at 40.8% and a deep cut at
     46.3%. The figure is now the hit slot alone, so a lone ghost and a bucket of album
     cuts are told apart on a short playlist exactly as they are on a long one. */
  it("prices a lone ghost on a short playlist the way it prices one on a long playlist", () => {
    const short = [
      ...many(DeepcutTier.Rotation, 1),
      ...many(DeepcutTier.Album, 7),
      ...many(DeepcutTier.Deepcut, 3),
      ...many(DeepcutTier.Ghost, 1),
    ];
    const long = [
      ...many(DeepcutTier.Rotation, 1),
      ...many(DeepcutTier.Album, 275),
      ...many(DeepcutTier.Deepcut, 3),
      ...many(DeepcutTier.Ghost, 1),
    ];

    /* The ghost's own weight plus the 1% that falls through from an empty `lost`, over
       the one track carrying it. Playlist length is not in that sentence anywhere. */
    expect(pullChance({ tier: DeepcutTier.Ghost, among: short })).toBe(7);
    expect(pullChance({ tier: DeepcutTier.Ghost, among: long })).toBe(7);
  });

  /* Rarity beats bucket size on the same playlist, which is the sentence the column is
     there to make: one ghost out of one is a better pull than one deep cut out of three. */
  it("prices a lone ghost above one of several deep cuts", () => {
    const among = [
      ...many(DeepcutTier.Album, 7),
      ...many(DeepcutTier.Deepcut, 3),
      ...many(DeepcutTier.Ghost, 1),
    ];

    expect(pullChance({ tier: DeepcutTier.Ghost, among })!).toBeGreaterThan(
      pullChance({ tier: DeepcutTier.Album, among })!
    );
  });

  /* A rung shares its weight evenly, because the hit slot picks uniformly once it has
     chosen one. Twice the tracks on a rung, half the odds for each of them. */
  it("splits a rung's weight evenly between the tracks on it", () => {
    const few = [...many(DeepcutTier.Album, 10), ...many(DeepcutTier.Deepcut, 2)];
    const several = [...many(DeepcutTier.Album, 10), ...many(DeepcutTier.Deepcut, 4)];

    expect(pullChance({ tier: DeepcutTier.Deepcut, among: few })!).toBeCloseTo(
      pullChance({ tier: DeepcutTier.Deepcut, among: several })! * 2,
      5
    );
  });

  /* ZERO IS AN ANSWER AND IT IS NOT NULL. The hit slot's commonest roll is album cut, so
     with album cuts on the playlist nothing above them can ever be the pull. The panel
     prints that as "common only" rather than as 0.0%. */
  it("gives no pull odds to a rung above anything the hit slot rolls", () => {
    const among = [
      ...many(DeepcutTier.Anthem, 10),
      ...many(DeepcutTier.Chart, 10),
      ...many(DeepcutTier.Album, 10),
    ];

    expect(pullChance({ tier: DeepcutTier.Anthem, among })).toBe(0);
    expect(pullChance({ tier: DeepcutTier.Chart, among })).toBe(0);
    expect(pullChance({ tier: DeepcutTier.Album, among })).toBeGreaterThan(0);
  });

  /* THE SAME RUNG, THE SAME PLAYLIST MINUS ITS ALBUM CUTS, AND NOW IT CAN BE THE PULL.
     That is why the zero above is per playlist and not a property of the rung: the hit
     slot's weight walks DOWN the ladder past empty buckets, so stripping the album cuts
     out hands their 46% to rotation. */
  it("gives a common rung real odds once nothing below it is left", () => {
    const among = [...many(DeepcutTier.Anthem, 10), ...many(DeepcutTier.Rotation, 10)];

    expect(pullChance({ tier: DeepcutTier.Rotation, among })!).toBeGreaterThan(0);
    expect(pullChance({ tier: DeepcutTier.Anthem, among })).toBe(0);
  });

  /* An empty bucket walks DOWN to the nearest rung that has a track, never up. With no
     lost, ghost or unheard songs, all of that weight lands on the deep cuts. */
  it("walks an empty bucket down the ladder rather than up", () => {
    const withRare = [
      ...many(DeepcutTier.Album, 30),
      ...many(DeepcutTier.Deepcut, 5),
      ...many(DeepcutTier.Lost, 5),
    ];
    const withoutRare = [
      ...many(DeepcutTier.Album, 30),
      ...many(DeepcutTier.Deepcut, 5),
      ...many(DeepcutTier.Chart, 5),
    ];

    const shared = pullChance({ tier: DeepcutTier.Deepcut, among: withRare })!;
    const inherited = pullChance({ tier: DeepcutTier.Deepcut, among: withoutRare })!;

    expect(inherited).toBeGreaterThan(shared);
  });

  /* The one card in a pack that rolls for a rung is one card, so no track can be more
     than certain of being it - and a playlist of one track is exactly that certain. */
  it("never exceeds a hundred percent", () => {
    expect(pullChance({ tier: DeepcutTier.Lost, among: many(DeepcutTier.Lost, 1) })).toBe(100);

    const among = [...many(DeepcutTier.Lost, 1), ...many(DeepcutTier.Chart, 5)];
    const value = pullChance({ tier: DeepcutTier.Lost, among })!;
    expect(value).toBeLessThanOrEqual(100);
    expect(value).toBeGreaterThan(0);
  });

  /* The whole hit slot is one card, so the odds across a playlist add up to that card
     and not to more. Rounding is the only reason this is not exact. */
  it("adds up to one hit slot across the whole playlist", () => {
    const among = [
      ...many(DeepcutTier.Chart, 12),
      ...many(DeepcutTier.Album, 7),
      ...many(DeepcutTier.Deepcut, 3),
      ...many(DeepcutTier.Ghost, 1),
    ];

    const total = among.reduce((sum, tier) => sum + pullChance({ tier, among })!, 0);

    expect(total).toBeCloseTo(100, 0);
  });
});
