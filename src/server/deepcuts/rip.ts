import "server-only";
import { DeepcutTier } from "@/models";
import type { PackCard, ScoredTrack } from "@/models";
import { getIsoDate, Timezone } from "@/oras";
import { drawPack } from "@/utils/packDraw";
import { packSeed, seededRandom } from "@/utils/seededRandom";
import { deepcutsStore } from "./store";
import { packContents } from "./packContents";

/**
 * Opening a pack.
 *
 * THE ONE PLACE THE WHOLE APP COMES TOGETHER. Spotify says which songs are on the
 * playlist, last.fm says how many people played each, rarityOf turns that into a rung,
 * drawPack deals five, and the store writes down what happened. Every one of those is
 * somebody else's file; this decides the order and what to do when a step gives nothing.
 *
 * SEEDED, WHICH IS WHAT MAKES ONE PACK A DAY MEAN ANYTHING. The generator is seeded on
 * the visitor, the playlist and the day, so the same person opening the same pack on the
 * same day gets the same five cards however many times they reload. Without that the cap
 * is unenforceable in the way that matters: refresh until the pull is good.
 *
 * WHAT IS STILL NOT ENFORCED, said plainly: a visitor can rip a DIFFERENT playlist the
 * same day and get a fresh pack. The seed makes each pack stable; it does not count them.
 * A real cap wants a row per visitor per day, which is what visitor_day does for the
 * suggestion box, and it is not written yet.
 *
 * UNSCOREABLE TRACKS ARE NOT IN THE POOL. A song last.fm could not match has no rung, and
 * docs/lab.md settles what to do with it: leave it out rather than guess. So the pool is
 * the scored tracks, and a playlist where nothing matched cannot be ripped at all.
 */

/** Every track that has a rung, in the shape drawPack wants. */
const eligible = (tracks: ScoredTrack[]) =>
  tracks
    .filter((track): track is ScoredTrack & { tier: DeepcutTier } => track.tier !== null)
    .map((track) => ({ track, tier: track.tier }));

/**
 * Deals a pack and records it.
 *
 * Null when there is nothing to deal from: Spotify unreachable, or a playlist with no
 * scoreable track on it. The route turns that into a refusal the visitor can read.
 */
export const ripPack = async (args: {
  playlist_id: string;
  visitor_id: string;
  /**
   * Deal every card that CAN be shiny as shiny.
   *
   * A PREVIEW SWITCH, AND THE ROUTE WILL NOT PASS IT OUTSIDE A LOCAL DEPLOYMENT. Shiny
   * is at most one card in a hundred on the rung that rolls it most often, so the
   * finish is otherwise unreviewable: you cannot look at a treatment you would have to
   * open a couple of hundred packs to see once. See rollShiny for what it does and does
   * not override.
   */
  force_shiny?: boolean;
}): Promise<PackCard[] | null> => {
  const { playlist_id, visitor_id, force_shiny = false } = args;

  const contents = await packContents({ playlist_id });
  if (!contents) return null;

  const pool = eligible(contents.tracks);
  if (pool.length === 0) return null;

  /* The same day key the suggestion cap uses, in Manila time rather than UTC: a pack
     should reset at local midnight and not at eight in the morning. */
  const day = getIsoDate.now({ timezone: Timezone.Manila });

  const drawn = drawPack({
    pool,
    random: seededRandom(packSeed({ visitor_id, playlist_id, day })),
    forceShiny: force_shiny,
  });

  const cards: PackCard[] = drawn.map((card, slot) => ({
    track: card.track,
    tier: card.tier,
    shiny: card.shiny,
    slot,
  }));

  /* WRITTEN DOWN AFTER THE CARDS EXIST, AND A FAILURE HERE DOES NOT COST THE PACK. The
     tally is what feeds the two figures at the top of the page; it is not what makes a
     rip valid. A database that cannot be reached should not stop somebody opening a pack,
     so this is caught here rather than thrown to the route.

     It does mean the counters can undercount a rip that happened. That is the right way
     round: a missing row is a number slightly low, and a refused rip is a broken app. */
  try {
    await deepcutsStore.recordRip({
      playlist_id,
      visitor_id,
      cards: cards.map((card) => ({
        track_uri: card.track.uri,
        title: card.track.title,
        artist: card.track.artist,
        tier: card.tier,
        play_count: card.track.plays,
        /* The face goes down with the rest, so the collection tab can render the card
           without asking Spotify about a song it already knows. `shiny` especially: it
           is a roll made once in drawPack and is in no other column. */
        album_art: card.track.album_art,
        track_url: card.track.url,
        shiny: card.shiny,
      })),
    });
  } catch (error) {
    console.error("[deepcuts] recording the rip failed:", error);
  }

  return cards;
};
