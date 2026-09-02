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
export const DEEPCUT_TIER: Record<
  DeepcutTier,
  { label: string; note: string }
> = {
  [DeepcutTier.Chart]: {
    label: "chart",
    note: "Everyone has heard it. You will pull it constantly.",
  },
  [DeepcutTier.Rotation]: {
    label: "rotation",
    note: "A song that had its year.",
  },
  [DeepcutTier.Album]: {
    label: "album cut",
    note: "Never a single. Played by people who played the album.",
  },
  [DeepcutTier.Deepcut]: {
    label: "deep cut",
    note: "Thin numbers. The app is named after this rung for a reason.",
  },
  [DeepcutTier.Unheard]: {
    label: "unheard",
    note: "Almost nobody has played this. The best thing in the pack.",
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
  DeepcutTier.Chart,
  DeepcutTier.Rotation,
  DeepcutTier.Album,
  DeepcutTier.Deepcut,
  DeepcutTier.Unheard,
];
