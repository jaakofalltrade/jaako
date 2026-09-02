/**
 * The lab: everything on this site that is not the portfolio.
 *
 * One entry per app in src/data/lab.ts, one folder per app under src/app/lab. The
 * whole plan behind these three fields is written down in docs/lab.md; what matters
 * here is that adding a fourth app is a row in the data file, not a decision.
 */

/**
 * Which app. The value is not the URL segment and must not be used as one — paths
 * live in src/client/endpoints.ts, as every other path on the site does.
 */
export enum LabAppId {
  Slots = "SLOTS",
  Suggest = "SUGGEST",
  Roast = "ROAST",
  Deepcuts = "DEEPCUTS",
}

/**
 * How far along it is, in the visitor's terms rather than in git's.
 *
 * Three states because a fourth would be a lie: either it is an idea, it is being
 * built, or you can use it. "Teaser" is not a status — every app is a teaser today,
 * which is what makes it a property of the site and not of the app.
 */
export enum LabStatus {
  Planned = "PLANNED",
  Building = "BUILDING",
  Live = "LIVE",
}

/**
 * Which frame the app renders inside.
 *
 * Site keeps PageShell, so the ticker footer and the now-playing dock follow the
 * visitor in. Bare gets the viewport and paints its own ground.
 *
 * This field is documentation, not wiring: what actually decides the frame is which
 * route group the page sits in (see docs/lab.md). Nothing checks that the two agree,
 * so if you move a page between groups, move this too.
 */
export enum LabShell {
  Site = "SITE",
  Bare = "BARE",
}

export type LabApp = {
  id: LabAppId;
  /** Two-digit editorial index, as the homepage sections carry. */
  index: string;
  name: string;
  /** One line, on the index. What it is, not why it is good. */
  blurb: string;
  status: LabStatus;
  shell: LabShell;
  href: string;
  /**
   * The art direction, in three or four words.
   *
   * It used to be printed under every row on the index - "looks like: arcade CRT" -
   * and it is not any more: three captions stacked down a list of four-word links
   * turned a catalogue into a spec sheet, and LAB_INTRO.aside already says the one
   * thing they were collectively for. The field stays because an app page can still
   * use its own: /lab/slots prints it beside the index in the cabinet chrome.
   */
  look: string;
};

/**
 * deepcuts' rarity ladder, commonest first.
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
