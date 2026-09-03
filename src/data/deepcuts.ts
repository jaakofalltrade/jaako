import { PACK_SIZE } from "@/constants";
import { DeepcutTier } from "@/models";
import type { DeepcutCard, DeepcutPack, MetaPair } from "@/models";

/**
 * /lab/deepcuts: its copy, and the pack it deals until it can deal a real one.
 *
 * Split out of data/lab.ts when the app stopped being a teaser. The other three still
 * live there because they are still one static block of words each; this one now has
 * a sample pack sitting next to its sentences, and a fixture is not copy.
 */

export const DEEPCUTS_COPY = {
  title: "deepcuts",
  subtitle: "a pack, out of my playlist",
  /**
   * States the inversion in the first clause, because everything after it reads wrong
   * to anyone still assuming the hits are the prize.
   */
  lead: "Rip a pack and the songs almost nobody plays are the ones worth keeping. Five cards out of a playlist I actually listen to, scored on how few plays each track has, so a chart hit is the card you throw back and a track with four thousand plays is the pull.",

  /* The wrapper. Printed on the foil, so these are read as packaging. */
  pack_label: "deepcuts",
  pack_series: "series 01",
  // Derived, so the wrapper cannot promise a different number from the one dealt.
  pack_count: `${PACK_SIZE} cards`,
  /** On the tear strip. It is an instruction now, not a joke about a pack that never opens. */
  rip_label: "tear here",
  rip_note: "sealed",

  /** The control. A verb, because it does something now. */
  rip_action: "rip it",
  reset_action: "another pack",

  /** The monogram repeated across a card back, so the fan reads as a deck. */
  card_back: "JK",

  /**
   * The one line that keeps this page honest while the data is invented.
   *
   * Prominent rather than a footnote. Every number on every card below is made up, and
   * a visitor who works that out for themselves concludes the whole app is a mock-up,
   * which is a worse thing to conclude than the truth: the shapes are real and the
   * playlist is not plugged in yet.
   */
  sample_note: "These cards are a sample. The layout is real, the tracks and the play counts are invented, and nothing here has read my playlist yet.",

  ladder_label: "what is in a pack",
  /**
   * Says which direction is good once, in the legend, rather than trusting the order
   * of the rungs to carry it. A ladder printed commonest-first looks like every other
   * rarity ladder, and every other rarity ladder means the opposite of this one.
   */
  ladder_note: "Rarest at the bottom. The fewer plays a song has, the better the card.",

  spec_label: "the rules, so far",

  /**
   * The honest note about where the numbers will come from, expanded from the one-word
   * spec row into the sentence that row cannot fit.
   */
  source_note: "Spotify does not publish play counts and never has, so the counts will come from last.fm scrobbles. They are a decent proxy for how much of the world has heard a song, and they are not Spotify's streams.",

  /** Read out on the fan while it is still face down. */
  fan_label: "Five cards, face down.",
  /** Read out on a card face, so the tier is not carried by colour alone. */
  plays_label: "plays",
} as const;

/*
 * The readout is declared outside the copy object and typed MetaPair for the reason
 * data/lab.ts gives: DefinitionList takes a mutable array and a readonly one is not
 * assignable to it, which reads as a mistake in the component rather than here.
 *
 * "pack" is derived and the rest are not, because PACK_SIZE is the only one of these
 * the code actually enforces yet. When a route starts counting rips, "packs" becomes a
 * reference too.
 */
export const DEEPCUTS_SPEC: MetaPair[] = [
  { term: "pack", value: `${PACK_SIZE} cards` },
  { term: "packs", value: "1 / day" },
  { term: "pulled from", value: "a playlist of mine" },
  { term: "rarity", value: "fewest plays wins" },
  { term: "plays", value: "last.fm, not spotify" },
  { term: "thresholds", value: "undecided" },
];

/* ---------------- the sample pack ----------------

   EVERY TRACK BELOW IS INVENTED, and that is deliberate rather than lazy.

   The obvious way to fill a mock-up is with real songs, and it would mean printing a
   play count next to a real artist's name that no one has looked up. That is a made-up
   number wearing a real thing's clothes, and it stays wrong even with a disclaimer over
   it. Invented titles cannot be misread as a claim about anybody.

   They are shaped to be awkward on purpose. A mock-up filled with tidy four-word
   titles proves the layout survives tidy four-word titles and nothing else, so there
   is a title long enough to wrap twice, an artist name long enough to compete with it,
   and a one-word artist at the rarest rung where the eye is meant to land.

   Ordered worst to best, which is the order the reveal turns them over in. The last
   card is the pull and it is last for that reason. */

const cards: DeepcutCard[] = [
  {
    id: "sample-chart",
    title: "Nightswim",
    artist: "Coral Vista",
    album: "Bright Static",
    plays: 48_912_004,
    tier: DeepcutTier.Chart,
    art_url: null,
    spotify_url: "#",
  },
  {
    id: "sample-rotation",
    title: "Carry the Weather",
    artist: "Odessa Fields",
    album: "Long Way Around",
    plays: 6_204_551,
    tier: DeepcutTier.Rotation,
    art_url: null,
    spotify_url: "#",
  },
  {
    id: "sample-album",
    title: "Perennial (Reprise)",
    artist: "Marlowe and the Tide",
    album: "Perennial",
    plays: 812_340,
    tier: DeepcutTier.Album,
    art_url: null,
    spotify_url: "#",
  },
  {
    id: "sample-deepcut",
    title: "Tin Roof, August",
    artist: "The Halcyon Bureau",
    album: "Slow Inventory",
    plays: 41_208,
    tier: DeepcutTier.Deepcut,
    art_url: null,
    spotify_url: "#",
  },
  {
    id: "sample-unheard",
    title: "Everything Was Fine Until the Tape Ran Out",
    artist: "Sable",
    album: "Home Recordings",
    plays: 3_417,
    tier: DeepcutTier.Unheard,
    art_url: null,
    spotify_url: "#",
  },
];

/**
 * The pack the page deals.
 *
 * A function rather than a constant, because every rip needs its own `id`: that id is
 * the React key on the fan, and a key that does not change is a second rip that does
 * not animate. The cards themselves are the same objects each time — they are a
 * fixture, not a deal — which is the one thing about this that a real dealer will
 * change.
 */
export const getSamplePack = (): DeepcutPack => ({
  id: `sample-${Date.now()}`,
  cards,
});
