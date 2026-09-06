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
 * MEASURED, NOT REASONED, AND THAT REPLACED A RULE THAT SOUNDED BETTER THAN IT WORKED.
 * These used to be one order of magnitude apart, on the argument that play counts are a
 * power law and a log ladder is the only one with evenly spaced steps against one. The
 * argument is sound and the ANCHORING it implied was not, because of what the numbers
 * actually are.
 *
 * THE NUMBERS ARE LAST.FM SCROBBLES, NOT SPOTIFY STREAMS, and they are far smaller. A
 * scrobble is a play a listener's client reported to last.fm, and most listeners run no
 * such client, so a scrobble count is a small biased sample of a stream count. Spotify's
 * API publishes no play counts at all, so there is no second column to convert against -
 * the only thing the ladder can be anchored on is the shape of the catalogue being
 * scored. `pnpm ladder:spread` is what measures that, and it is what these came from.
 *
 * WHAT IT FOUND, over 1,097 matched tracks across 60 playlists: the account's whole
 * catalogue tops out at 46.7 million scrobbles. The old floors put `chart` at a hundred
 * million and `anthem` at five hundred, so TWO OF THE EIGHT RUNGS COULD NOT BE REACHED
 * BY ANY SONG ON THE ACCOUNT - printed in the legend, weighted in the hit slot, and dealt
 * never. Eight decade-wide rungs need seven decades of range; the catalogue has about
 * four, from a p5 of 8.8k to that maximum. No anchor fixes that. The step had to shrink.
 *
 * SO THE RULE IS NOW THE SHARE RATHER THAN THE STEP. Each floor is a quantile of the
 * measured distribution, rounded to a number a legend can print, chosen so the rungs fall
 * away like a card set does:
 *
 *     rung        floor        share of the catalogue
 *     anthem      5,000,000      28.8%
 *     chart       1,000,000      26.1%
 *     rotation      200,000      21.2%
 *     album cut      30,000      11.5%
 *     deep cut        8,000       7.6%
 *     unheard         2,000       2.6%
 *     ghost             200       1.5%
 *     lost                0       0.6%
 *
 * Every rung reachable, and the shares fall monotonically toward the rare end, which is
 * the property the old ladder never had on real data.
 *
 * `lost` floors at zero rather than at some small number, so every non-negative count
 * lands somewhere. Zero is a real answer - last.fm knows the track and nobody has
 * scrobbled it - and it is the genuine top of the ladder. A track last.fm cannot match
 * at all has no count and therefore no rung; see rarityOf.
 *
 * STILL TUNING CONSTANTS. They are anchored on ONE ACCOUNT'S taste, which is the honest
 * scope of this app, and adding a few hundred stadium-rock songs would pull them up.
 * Re-run `pnpm ladder:spread` before moving them, and move the whole set: the shares
 * above are the thing being preserved, not any single number in the column.
 */
export const DEEPCUT_TIER_FLOOR: Record<DeepcutTier, number> = {
  [DeepcutTier.Anthem]: 5_000_000,
  [DeepcutTier.Chart]: 1_000_000,
  [DeepcutTier.Rotation]: 200_000,
  [DeepcutTier.Album]: 30_000,
  [DeepcutTier.Deepcut]: 8_000,
  [DeepcutTier.Unheard]: 2_000,
  [DeepcutTier.Ghost]: 200,
  [DeepcutTier.Lost]: 0,
};
