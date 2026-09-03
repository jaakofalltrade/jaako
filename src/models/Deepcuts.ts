/**
 * deepcuts: the cards, the pack, and the ladder they are graded on.
 *
 * Its own file rather than more of Lab.ts. That one describes the lab register — which
 * apps exist, how far along they are, which frame they render in — and it is read every
 * time someone touches the index. A card's album art has nothing to do with any of
 * that, and the moment an app grows a domain of its own it stops being a row.
 *
 * The plan these types came out of is the deepcuts section of docs/lab.md.
 */

/**
 * The rarity ladder, commonest first.
 *
 * The declaration order is the mechanic, not a formatting choice. It runs from the
 * songs everyone has already played to the ones almost nobody has, so a card gets
 * rarer as its play count falls — the inversion the whole app is built on, and the
 * reason a chart hit is the card you throw away.
 *
 * Named after what a song is rather than what a skin is worth. "Covert" and "Mil-Spec"
 * would have been the closer analogy and they say nothing about music; these say where
 * a track sits in a listener's life, which is the thing being scored.
 *
 * The play counts that separate one rung from the next are not decided and are not
 * modelled here. They are a tuning constant, they will move once there is real data,
 * and pinning them into the type would make a tuning pass a schema change.
 */
export enum DeepcutTier {
  Chart = "CHART",
  Rotation = "ROTATION",
  Album = "ALBUM",
  Deepcut = "DEEPCUT",
  Unheard = "UNHEARD",
}

/**
 * One card. A track off the playlist, with the number it was graded on.
 *
 * `plays` is nullable and that is not defensive typing. Last.fm is asked for a track by
 * artist and title, and the match genuinely fails: a live version, a re-release, a
 * name it spells differently, or nothing at all. A card with no number cannot be
 * graded, and the honest answer is to leave it out of the pack rather than invent a
 * rung for it — but the type has to be able to say so before the dealing code can.
 *
 * `art_url` is nullable for a duller reason: the art is an i.scdn.co URL and the CSP
 * allows that host only. Until a real playlist read supplies one, a card draws the
 * slot as a shape.
 */
export type DeepcutCard = {
  /** The Spotify track id. Unique inside a pack, and the React key. */
  id: string;
  title: string;
  artist: string;
  album: string;
  /** Global last.fm scrobbles. Null when the track could not be matched. */
  plays: number | null;
  tier: DeepcutTier;
  /** i.scdn.co album art. Null until a real playlist read supplies one. */
  art_url: string | null;
  spotify_url: string;
};

/**
 * A dealt pack.
 *
 * `id` exists so a reset deals a genuinely new pack rather than re-rendering the same
 * one: it is what changes the React key on the fan, which is what makes every card
 * mount again and replay its flip. Without it the second rip is a static page.
 */
export type DeepcutPack = {
  id: string;
  cards: DeepcutCard[];
};

/**
 * What the wrapper is doing.
 *
 * Two states, not three. "Ripping" was modelled and removed: the tear is a CSS
 * animation on the way out, so a state for it would be a timer in React whose only job
 * is to agree with a duration written in a stylesheet. The pack is shut or it is open,
 * and the animation happens in between without anything having to hold that fact.
 */
export enum PackState {
  Sealed = "SEALED",
  Open = "OPEN",
}
