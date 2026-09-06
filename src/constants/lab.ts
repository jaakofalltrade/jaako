import { BadgeTone, DeepcutTier, LabStatus } from "@/models";

/**
 * Fixed values for the lab index. Same arrangement as PLAYBACK_BADGE in
 * constants/spotify.ts: a state maps to a label and a tone, in one table, so no
 * component ever builds either out of a variable.
 */

export const LAB_STATUS_BADGE: Record<
  LabStatus,
  { label: string; tone: BadgeTone }
> = {
  // Cyan is the accent, and live is the only status that gets it. Keeping it to one
  // status is what makes it worth looking at on the index.
  [LabStatus.Live]: { label: "live", tone: BadgeTone.Cyan },
  [LabStatus.Building]: { label: "building", tone: BadgeTone.Steel },
  // Ghost is the retired tone elsewhere on the site. It reads correctly here too: an
  // idea nobody has started is quiet in exactly the same way an archived thing is.
  [LabStatus.Planned]: { label: "planned", tone: BadgeTone.Ghost },
};

/**
 * The deepcuts ladder as the card faces print it.
 *
 * Same arrangement again: a tier maps to its label and to the one line that says what
 * kind of song sits on that rung. No tone, because a card's colour is not a token from
 * this file — /lab/deepcuts declares its own foils locally, as every bare lab app
 * declares its own everything.
 *
 * `note` is written for a reader who has never opened a pack and does not know which
 * end of the ladder is good. It has to answer that on its own, on a legend, with no
 * surrounding sentence to lean on.
 */
/**
 * The symbol is the set mark a card carries in its corner, and the run is the point of
 * it: an open circle filling up, then a diamond, then stars. A reader who has seen two
 * cards can order a third without reading a word, which is what a rarity mark is for.
 */
export const DEEPCUT_TIER: Record<
  DeepcutTier,
  { label: string; note: string; symbol: string }
> = {
  [DeepcutTier.Anthem]: {
    symbol: "○",
    label: "anthem",
    note: "Everyone alive has heard this. Throw it straight back.",
  },
  [DeepcutTier.Chart]: {
    symbol: "◔",
    label: "chart",
    note: "A hit. You will pull these constantly.",
  },
  [DeepcutTier.Rotation]: {
    symbol: "◑",
    label: "rotation",
    note: "A song that had its year.",
  },
  [DeepcutTier.Album]: {
    symbol: "◕",
    label: "album cut",
    note: "Never a single. Played by people who played the album.",
  },
  [DeepcutTier.Deepcut]: {
    symbol: "●",
    label: "deep cut",
    note: "Thin numbers. The app is named after this rung for a reason.",
  },
  [DeepcutTier.Unheard]: {
    symbol: "◆",
    label: "unheard",
    note: "Almost nobody has played this.",
  },
  [DeepcutTier.Ghost]: {
    symbol: "✦",
    label: "ghost",
    note: "A few hundred people, ever, anywhere.",
  },
  [DeepcutTier.Lost]: {
    symbol: "✷",
    label: "lost",
    note: "Barely a trace of anyone hearing it. The best thing in a pack.",
  },
};

/**
 * The ladder in order, commonest first.
 *
 * Written out rather than taken from `Object.values(DeepcutTier)`. That would work
 * today and it would put the render order at the mercy of how the enum happens to be
 * sorted in a file nobody edits with a legend in mind. Order is a design decision
 * here, so it is stated where the design can see it.
 */
export const DEEPCUT_LADDER: DeepcutTier[] = [
  DeepcutTier.Anthem,
  DeepcutTier.Chart,
  DeepcutTier.Rotation,
  DeepcutTier.Album,
  DeepcutTier.Deepcut,
  DeepcutTier.Unheard,
  DeepcutTier.Ghost,
  DeepcutTier.Lost,
];

/**
 * The fewest plays a track can have and still land on each rung.
 *
 * ONE ORDER OF MAGNITUDE PER RUNG. The reasoning is written out in full at the top of
 * src/utils/rarity.ts, which is the only thing that reads this: play counts are a power
 * law spanning six or seven decades, and a logarithmic ladder is the only one whose
 * steps are evenly spaced against that.
 *
 * MOVED UP A DECADE, AND MEASUREMENT IS WHY. The first eight-rung ladder ran from a
 * thousand plays to a hundred million, and against real playlists it bunched at the
 * common end: one list came back 21 chart and 21 rotation with nothing below album cut,
 * because a million scrobbles is an ordinary number for a song somebody actually likes.
 * Every floor above `lost` is ten times what it was, so the rare rungs are reachable by
 * songs that are genuinely obscure rather than merely not famous.
 *
 * ANTHEM IS THE ONE HALF-STEP. It floors at 500 million rather than a billion, because a
 * billion scrobbles is a handful of songs in history and a rung nothing lands on is not a
 * rung. Everything below it is a clean decade.
 *
 * `lost` floors at zero rather than at some small number, so every non-negative count
 * lands somewhere. Zero is a real answer - last.fm knows the track and nobody has
 * scrobbled it - and it is the genuine top of the ladder. A track last.fm cannot match
 * at all has no count and therefore no rung; see rarityOf.
 *
 * TUNING CONSTANTS, AND THE FIRST THING THAT WILL MOVE. docs/lab.md called the
 * thresholds undecided and it was right to: where the ladder is ANCHORED depends on the
 * kind of music being scored, and a playlist two decades quieter than these numbers
 * assume comes out as five unheards. What is settled is the shape, one decade per rung.
 * Move these; do not add rungs between them.
 */
export const DEEPCUT_TIER_FLOOR: Record<DeepcutTier, number> = {
  [DeepcutTier.Anthem]: 500_000_000,
  [DeepcutTier.Chart]: 100_000_000,
  [DeepcutTier.Rotation]: 10_000_000,
  [DeepcutTier.Album]: 1_000_000,
  [DeepcutTier.Deepcut]: 100_000,
  [DeepcutTier.Unheard]: 10_000,
  [DeepcutTier.Ghost]: 1_000,
  [DeepcutTier.Lost]: 0,
};
