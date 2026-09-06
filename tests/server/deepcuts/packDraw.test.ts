import { describe, expect, it } from "vitest";
import { DEEPCUT_LADDER, DeepcutTier } from "@/models";
import { drawPack } from "@/server/deepcuts/packDraw";
import type { Drawable } from "@/server/deepcuts/packDraw";
import { packSeed, seededRandom } from "@/server/deepcuts/seededRandom";

/**
 * Dealing a pack.
 *
 * The randomness is an argument here rather than a global, which is the whole reason
 * any of this is testable: a fixed seed deals a fixed pack, and a counted sequence lets
 * a test aim the hit slot at a particular rung.
 */

const song = (tier: DeepcutTier, name: string): Drawable<string> => ({ track: name, tier });

/** A pool of `count` tracks on one rung, named so a test can tell them apart. */
const many = (tier: DeepcutTier, count: number, prefix: string): Drawable<string>[] =>
  Array.from({ length: count }, (_, index) => song(tier, `${prefix}-${index}`));

describe("drawPack", () => {
  it("deals five cards from a playlist with plenty", () => {
    const pool = many(DeepcutTier.Silver, 40, "a");
    expect(drawPack({ pool, random: seededRandom("x") })).toHaveLength(5);
  });

  /* Several playlists on the account have one or two songs. A pack of three is a real
     state, not an error. */
  it("deals what there is when the playlist is smaller than a pack", () => {
    const pool = many(DeepcutTier.Silver, 3, "a");
    expect(drawPack({ pool, random: seededRandom("x") })).toHaveLength(3);
  });

  it("deals nothing from an empty pool", () => {
    expect(drawPack({ pool: [], random: seededRandom("x") })).toEqual([]);
  });

  /* THE PROPERTY A PACK RIP MUST HAVE. Five slots, five different songs. take() splices
     the pool, and the hit is removed from the real pool by hand after being drawn from a
     filtered copy - that second step is what this catches if it is ever dropped. */
  it("never deals the same song twice", () => {
    for (let run = 0; run < 200; run += 1) {
      const pool = [
        ...many(DeepcutTier.Platinum, 6, "c"),
        ...many(DeepcutTier.Silver, 4, "a"),
        ...many(DeepcutTier.Lost, 1, "l"),
      ];

      const drawn = drawPack({ pool, random: seededRandom(`run-${run}`) }).map((c) => c.track);
      expect(new Set(drawn).size, `run ${run}`).toBe(drawn.length);
    }
  });

  it("leaves the caller's pool untouched", () => {
    const pool = many(DeepcutTier.Silver, 20, "a");
    drawPack({ pool, random: seededRandom("x") });
    expect(pool).toHaveLength(20);
  });

  /* THE SAME SEED DEALS THE SAME PACK, which is what makes "one pack a day" hold: a
     refresh cannot re-roll a bad pull. */
  it("is deterministic for a seed", () => {
    const pool = () => [
      ...many(DeepcutTier.Platinum, 20, "c"),
      ...many(DeepcutTier.Deepcut, 5, "d"),
      ...many(DeepcutTier.Ghost, 2, "g"),
    ];

    const seed = packSeed({ visitor_id: "v", playlist_id: "p", day: "2026-09-06" });

    const first = drawPack({ pool: pool(), random: seededRandom(seed) });
    const second = drawPack({ pool: pool(), random: seededRandom(seed) });

    expect(first).toEqual(second);
  });

  it("deals a different pack on a different day", () => {
    const pool = () => many(DeepcutTier.Silver, 60, "a");
    const of = (day: string) =>
      drawPack({
        pool: pool(),
        random: seededRandom(packSeed({ visitor_id: "v", playlist_id: "p", day })),
      }).map((c) => c.track);

    expect(of("2026-09-06")).not.toEqual(of("2026-09-07"));
  });

  it("deals a different pack to a different visitor", () => {
    const pool = () => many(DeepcutTier.Silver, 60, "a");
    const of = (visitor_id: string) =>
      drawPack({
        pool: pool(),
        random: seededRandom(packSeed({ visitor_id, playlist_id: "p", day: "2026-09-06" })),
      }).map((c) => c.track);

    expect(of("one")).not.toEqual(of("two"));
  });

  /* NO CARD IS SPECIAL ANY MORE, AND THIS IS WHAT THAT MEANS. There used to be a reserved
     hit slot: the last card never rolled a common rung, so a playlist with anything good
     on it finished on something good, every time. Every card rolls its own rung now, so
     the last one is as ordinary as the first - and on a pool that is mostly diamonds and
     platinums, the last card is usually one of those.

     Kept as a test rather than deleted because it is the guarantee that WENT, and somebody
     reading the draw later is entitled to know it was given up on purpose. */
  it("does not reserve the last card for a rare rung", () => {
    let commonLast = 0;

    for (let run = 0; run < 200; run += 1) {
      const pool = [
        ...many(DeepcutTier.Diamond, 30, "d"),
        ...many(DeepcutTier.Platinum, 30, "p"),
        ...many(DeepcutTier.Silver, 4, "s"),
        ...many(DeepcutTier.Ghost, 2, "g"),
      ];

      const drawn = drawPack({ pool, random: seededRandom(`last-${run}`) });
      const last = drawn[drawn.length - 1].tier;
      if (last === DeepcutTier.Diamond || last === DeepcutTier.Platinum) commonLast += 1;
    }

    // Under the old shape this was exactly zero.
    expect(commonLast).toBeGreaterThan(100);
  });

  /* EVERY CARD ROLLS, WHICH IS THE WHOLE CHANGE. Over enough packs from a pool that holds
     every rung, all eight have to turn up - under the old shape the four commonest could
     only ever arrive by a uniform draw and the rarest four only through one slot. */
  it("can deal any rung on any card", () => {
    const seen = new Set<DeepcutTier>();

    for (let run = 0; run < 400; run += 1) {
      const pool = DEEPCUT_LADDER.flatMap((tier, index) => many(tier, 6, `t${index}`));
      for (const card of drawPack({ pool, random: seededRandom(`any-${run}`) })) {
        seen.add(card.tier);
      }
    }

    expect([...seen].sort()).toEqual([...DEEPCUT_LADDER].sort());
  });

  /* An empty bucket falls toward the COMMON end. A playlist whose rarest songs are silver
     must never produce a ghost, however a card rolls. */
  it("never invents a rung the playlist does not have", () => {
    for (let run = 0; run < 100; run += 1) {
      const pool = [
        ...many(DeepcutTier.Platinum, 20, "c"),
        ...many(DeepcutTier.Silver, 6, "a"),
      ];

      const drawn = drawPack({ pool, random: seededRandom(`walk-${run}`) });
      for (const card of drawn) {
        expect([DeepcutTier.Platinum, DeepcutTier.Silver], `run ${run}`).toContain(card.tier);
      }
    }
  });

  /* Only the three rarest rungs carry a shiny chance at all. A shiny platinum would spend
     the effect on the card you were going to throw back. */
  it("never makes a common card shiny", () => {
    for (let run = 0; run < 300; run += 1) {
      const pool = [
        ...many(DeepcutTier.Platinum, 10, "c"),
        ...many(DeepcutTier.Silver, 10, "a"),
      ];

      for (const card of drawPack({ pool, random: seededRandom(`shiny-${run}`) })) {
        expect(card.shiny, `run ${run}`).toBe(false);
      }
    }
  });

  /* And shiny does happen, at roughly the documented rate. Loose bounds on purpose: this
     is here to catch a roll that never fires or always fires, not to re-derive 1%. */
  it("makes an unheard card shiny occasionally", () => {
    let shiny = 0;

    for (let run = 0; run < 4000; run += 1) {
      const pool = many(DeepcutTier.Unheard, 12, "u");
      for (const card of drawPack({ pool, random: seededRandom(`u-${run}`) })) {
        if (card.shiny) shiny += 1;
      }
    }

    expect(shiny).toBeGreaterThan(0);
    // 5 cards x 4000 packs at 1% is about 200. Anything near that is fine.
    expect(shiny).toBeLessThan(600);
  });

  /* THE PROPERTY THE PREVIEW SWITCH LIVES OR DIES BY. `forceShiny` exists so the finish
     can be looked at without opening two hundred packs, and it is only useful if it shows
     the pack you would otherwise have got with the finish turned on. Skipping the roll
     when forcing would consume one fewer number from the seeded generator, and every card
     after the first would be a different song - a preview of a pack that does not exist. */
  it("forces the finish without changing which songs are dealt", () => {
    const pool = many(DeepcutTier.Ghost, 12, "g");

    const plain = drawPack({ pool, random: seededRandom("preview") });
    const forced = drawPack({ pool, random: seededRandom("preview"), forceShiny: true });

    expect(forced.map((card) => card.track)).toEqual(plain.map((card) => card.track));
    expect(forced.every((card) => card.shiny)).toBe(true);
  });

  /* AND IT DOES NOT INVENT A CARD THAT CANNOT EXIST. Only three rungs appear in
     SHINY_ODDS, so only three can carry the finish; a shiny album cut is not a rare card,
     it is a bug with a rainbow on it. */
  it("leaves a rung that can never be shiny plain, even when forced", () => {
    const pool = many(DeepcutTier.Silver, 12, "a");
    const forced = drawPack({ pool, random: seededRandom("preview"), forceShiny: true });

    expect(forced.length).toBeGreaterThan(0);
    expect(forced.some((card) => card.shiny)).toBe(false);
  });

  /* THE PACK THAT CAME OUT SHORT, pinned so it cannot come back. The hit slot's rung
     walk used to go DOWN the ladder and stop there. On a playlist whose commonest song
     is a deep cut, every roll of a commoner rung found nothing at or below itself,
     resolved to no rung at all, and the pack came up short: 92 packs in 200 were dealt
     with FOUR cards. resolveDrawRung falls back up when there is nothing below, which
     cannot hand out an unearned rarity, because reaching that clause means the playlist
     has nothing commoner to give. Every card rolls now, so the same gap would have cost
     a card on any of the five rather than only the last. */
  it("deals a full pack when nothing on the playlist is as common as a card rolls", () => {
    const pool: Drawable<string>[] = Array.from({ length: 30 }, (_, index) => ({
      track: `t${index}`,
      tier: index % 2 ? DeepcutTier.Deepcut : DeepcutTier.Ghost,
    }));

    for (let seed = 0; seed < 200; seed += 1) {
      const cards = drawPack({ pool, random: seededRandom(`short-${seed}`) });
      expect(cards, `seed ${seed}`).toHaveLength(5);
    }
  });
});
