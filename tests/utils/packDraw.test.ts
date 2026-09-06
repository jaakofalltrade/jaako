import { describe, expect, it } from "vitest";
import { DeepcutTier } from "@/models";
import { drawPack } from "@/utils/packDraw";
import type { Drawable } from "@/utils/packDraw";
import { packSeed, seededRandom } from "@/utils/seededRandom";

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
    const pool = many(DeepcutTier.Album, 40, "a");
    expect(drawPack({ pool, random: seededRandom("x") })).toHaveLength(5);
  });

  /* Several playlists on the account have one or two songs. A pack of three is a real
     state, not an error. */
  it("deals what there is when the playlist is smaller than a pack", () => {
    const pool = many(DeepcutTier.Album, 3, "a");
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
        ...many(DeepcutTier.Chart, 6, "c"),
        ...many(DeepcutTier.Album, 4, "a"),
        ...many(DeepcutTier.Lost, 1, "l"),
      ];

      const drawn = drawPack({ pool, random: seededRandom(`run-${run}`) }).map((c) => c.track);
      expect(new Set(drawn).size, `run ${run}`).toBe(drawn.length);
    }
  });

  it("leaves the caller's pool untouched", () => {
    const pool = many(DeepcutTier.Album, 20, "a");
    drawPack({ pool, random: seededRandom("x") });
    expect(pool).toHaveLength(20);
  });

  /* THE SAME SEED DEALS THE SAME PACK, which is what makes "one pack a day" hold: a
     refresh cannot re-roll a bad pull. */
  it("is deterministic for a seed", () => {
    const pool = () => [
      ...many(DeepcutTier.Chart, 20, "c"),
      ...many(DeepcutTier.Deepcut, 5, "d"),
      ...many(DeepcutTier.Ghost, 2, "g"),
    ];

    const seed = packSeed({ visitor_id: "v", playlist_id: "p", day: "2026-09-06" });

    const first = drawPack({ pool: pool(), random: seededRandom(seed) });
    const second = drawPack({ pool: pool(), random: seededRandom(seed) });

    expect(first).toEqual(second);
  });

  it("deals a different pack on a different day", () => {
    const pool = () => many(DeepcutTier.Album, 60, "a");
    const of = (day: string) =>
      drawPack({
        pool: pool(),
        random: seededRandom(packSeed({ visitor_id: "v", playlist_id: "p", day })),
      }).map((c) => c.track);

    expect(of("2026-09-06")).not.toEqual(of("2026-09-07"));
  });

  it("deals a different pack to a different visitor", () => {
    const pool = () => many(DeepcutTier.Album, 60, "a");
    const of = (visitor_id: string) =>
      drawPack({
        pool: pool(),
        random: seededRandom(packSeed({ visitor_id, playlist_id: "p", day: "2026-09-06" })),
      }).map((c) => c.track);

    expect(of("one")).not.toEqual(of("two"));
  });

  /* THE HIT SLOT IS THE POINT OF THE WHOLE SHAPE. It never rolls a common rung, so on a
     playlist that has anything at album cut or better the last card is one of those,
     every time, whatever the seed. */
  it("always finishes on a rung the hit slot can roll", () => {
    const reachable = [
      DeepcutTier.Album,
      DeepcutTier.Deepcut,
      DeepcutTier.Unheard,
      DeepcutTier.Ghost,
      DeepcutTier.Lost,
    ];

    for (let run = 0; run < 100; run += 1) {
      const pool = [
        ...many(DeepcutTier.Anthem, 30, "an"),
        ...many(DeepcutTier.Chart, 30, "c"),
        ...many(DeepcutTier.Album, 4, "a"),
        ...many(DeepcutTier.Ghost, 2, "g"),
      ];

      const drawn = drawPack({ pool, random: seededRandom(`hit-${run}`) });
      expect(reachable, `run ${run}`).toContain(drawn[drawn.length - 1].tier);
    }
  });

  /* An empty bucket falls toward the COMMON end. A playlist whose rarest songs are album
     cuts must never produce a ghost, however the hit slot rolls. */
  it("never invents a rung the playlist does not have", () => {
    for (let run = 0; run < 100; run += 1) {
      const pool = [
        ...many(DeepcutTier.Chart, 20, "c"),
        ...many(DeepcutTier.Album, 6, "a"),
      ];

      const drawn = drawPack({ pool, random: seededRandom(`walk-${run}`) });
      for (const card of drawn) {
        expect([DeepcutTier.Chart, DeepcutTier.Album], `run ${run}`).toContain(card.tier);
      }
    }
  });

  /* Only the three rarest rungs carry a shiny chance at all. A shiny chart hit would
     spend the effect on the card you were going to throw back. */
  it("never makes a common card shiny", () => {
    for (let run = 0; run < 300; run += 1) {
      const pool = [
        ...many(DeepcutTier.Chart, 10, "c"),
        ...many(DeepcutTier.Album, 10, "a"),
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

  /* THE PACK THAT CAME OUT SHORT, pinned so it cannot come back. The hit slot's rung
     walk used to go DOWN the ladder and stop there. On a playlist whose commonest song
     is a deep cut, every roll of "album" - 46% of them - found nothing at or below
     itself, resolved to no rung at all, and drawPack had no hit to append: 92 packs in
     200 were dealt with FOUR cards. resolveHitRung now falls back up when there is
     nothing below, which cannot hand out an unearned rarity, because reaching that
     clause means the playlist has nothing commoner to give. */
  it("deals a full pack when nothing on the playlist is as common as the hit slot rolls", () => {
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
