import { DeepcutTier } from "@/models";

/**
 * Fixed values for /lab/deepcuts.
 *
 * Moved out of constants/lab.ts when the app grew past being a row in the register,
 * for the reason models/Deepcuts.ts gives at greater length: the lab index reads that
 * file, and a rarity ladder is nothing to do with the lab index.
 *
 * Names still have to be unique across this folder, because the barrel is flat.
 */

/**
 * The ladder as the card faces print it.
 *
 * Same arrangement as LAB_STATUS_BADGE: a tier maps to its label and to the one line
 * that says what kind of song sits on that rung. No tone, because a card's colour is
 * not a token from this folder — /lab/deepcuts declares its own foils locally, as
 * every bare lab app declares its own everything.
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
 *
 * It is also the grading order: a rung's position in this array is how the reveal
 * decides which card is the best one in a pack, which is why nothing else may sort it.
 */
export const DEEPCUT_LADDER: DeepcutTier[] = [
  DeepcutTier.Chart,
  DeepcutTier.Rotation,
  DeepcutTier.Album,
  DeepcutTier.Deepcut,
  DeepcutTier.Unheard,
];

/** Cards dealt per pack. Printed on the wrapper, so the copy reads it rather than saying five. */
export const PACK_SIZE = 5;

/**
 * The gap between one card turning over and the next.
 *
 * The reveal is sequenced rather than simultaneous because the pack is ordered worst
 * to best: turning all five at once throws the ending away, and the only thing this
 * app has to sell is the moment the last card is not another chart hit.
 *
 * Read by the stylesheet through a custom property rather than by a timer in React.
 * Nothing in the component waits for this — the cards are all mounted and the stagger
 * is an animation-delay — so there is no state to get out of step with it.
 */
export const REVEAL_STAGGER_MS = 260;
