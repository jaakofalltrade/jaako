import { routes } from "@/client/endpoints";
import { DAILY_ADD_CAP, MAX_TRACK_MS, NAME_LIMITS } from "@/constants";
import { LabAppId, LabShell, LabStatus } from "@/models";
import type { LabApp, MetaPair } from "@/models";

/**
 * The lab's copy and its register of apps.
 *
 * Same split as src/data/site.ts against src/constants/site.ts: sentences live here,
 * identifiers live there. The plan every one of these entries came out of is in
 * docs/lab.md, and the teaser blocks at the foot of this file are the only copy the
 * three unbuilt pages render.
 *
 * Nothing here is a promise about a date. Every status is either planned or building,
 * and the index says so out loud rather than implying a launch.
 */

export const LAB_INTRO = {
  index: "05",
  title: "lab",
  note: "nothing here is finished",
  /**
   * What a lab is, not what is currently in it.
   *
   * It used to be a one-line trailer for the three apps below - "a slot machine, a
   * playlist you can put a song on, and an agent with opinions" - which read as a
   * summary of a list the reader was already looking at, and would have been wrong the
   * day a fourth app arrived. This describes the room instead, so it stays true however
   * the register underneath it changes.
   */
  lead: "The lab is the room off the side of the portfolio. Apps I built because I wanted them to exist, experiments I am using to learn something, and ideas too odd for the front page. They go up as they are made, finished or not.",
  /**
   * The line under the list. It exists to say the quiet part: these look nothing
   * alike on purpose, so a visitor who opens two of them is not seeing a bug. It is
   * the only place that says so now - the per-row "looks like:" caption is gone.
   */
  aside: "Each one gets its own design. That is most of the fun.",
} as const;

/*
 * The three entries are declared one at a time and then collected twice: once as the
 * ordered list the index renders, and once as a lookup so a page can ask for its own
 * row by id rather than scanning for it. Both views, one definition.
 */

const slots: LabApp = {
  id: LabAppId.Slots,
  index: "01",
  name: "slot machine",
  blurb: "Three pulls a day. Lose, or win a code you can mail me to claim.",
  status: LabStatus.Building,
  shell: LabShell.Bare,
  href: routes.lab.slots,
  look: "arcade CRT",
};

const suggest: LabApp = {
  id: LabAppId.Suggest,
  index: "02",
  name: "song suggestions",
  blurb: "Put a track on a public playlist I actually listen to, and see what everyone else added.",
  status: LabStatus.Planned,
  shell: LabShell.Site,
  href: routes.lab.suggest,
  look: "this one, unchanged",
};

const roast: LabApp = {
  id: LabAppId.Roast,
  index: "03",
  name: "spotify roast",
  blurb: "An agent reads your top artists and genres, then tells you what it thinks. It is not kind.",
  status: LabStatus.Planned,
  shell: LabShell.Bare,
  href: routes.lab.roast,
  look: "messaging app",
};

/** The order the index lists them in. Not alphabetical: it is the build order. */
export const LAB_APPS: LabApp[] = [slots, suggest, roast];

/** The same three, addressed by id, so a page can ask for its own row. */
export const LAB_APP: Record<LabAppId, LabApp> = {
  [LabAppId.Slots]: slots,
  [LabAppId.Suggest]: suggest,
  [LabAppId.Roast]: roast,
};

/* ---------------- the teasers ----------------

   Three unbuilt pages, each already wearing the design it will ship in. The copy is
   here rather than in the components for the same reason the rest of the site's is:
   a change of tone should be an edit to one file.

   Every one of these is written to be true today. None of them says "coming soon"
   with a date attached, because that is the one line a page like this cannot keep. */

/*
 * The two readout tables are declared outside their teaser objects and typed MetaPair
 * rather than inferred through `as const`. DefinitionList takes a mutable array, and
 * a readonly one is not assignable to it — which is a type error at the call site
 * that reads like a mistake in the component rather than in this file.
 */

const slotsReadout: MetaPair[] = [
  { term: "rolls", value: "3 / day" },
  { term: "cost", value: "nothing" },
  { term: "odds", value: "undecided" },
  { term: "prize", value: "a code, mailed in" },
];

/*
 * DERIVED, NOT WRITTEN OUT, and the row that forced it is "adds". It said two a day
 * while DAILY_ADD_CAP said three, which is the worst kind of wrong: the page states a
 * rule the server does not enforce, nobody notices, and the first visitor to find out
 * is told they have run out one add earlier than the page promised.
 *
 * Copy stays copy and numbers come from the constants that the route reads. The same
 * argument as counting ROLE_COUNT in the /experience metadata rather than writing
 * "six titles" twice.
 */
const suggestSpec: MetaPair[] = [
  { term: "playlist", value: "public, one of mine" },
  { term: "adds", value: `${DAILY_ADD_CAP} per person per day` },
  { term: "name", value: `${NAME_LIMITS.min} to ${NAME_LIMITS.max} characters` },
  { term: "longest track", value: `${MAX_TRACK_MS / 60_000} minutes` },
  { term: "approval", value: "none, it is instant" },
  { term: "duplicates", value: "refused" },
];

/** /lab/slots. Read on a dead cabinet: the reels are stopped, the lever does nothing. */
export const SLOTS_TEASER = {
  title: "slot machine",
  /** The three reel faces while the machine is out of order. */
  reels: ["W", "I", "P"],
  status: "out of order",
  lever_note: "lever not connected",
  readout: slotsReadout,
  /** The voucher stub under the cabinet. Masked, because there is nothing to print yet. */
  voucher_label: "winning ticket",
  voucher_code: "JK-XXXX-XXX",
  voucher_note: "scan it or type it, then mail it to me to claim",
  footnote: "Cabinet is being wired. Come back and pull it later.",
} as const;

/** /lab/roast. A chat that has not started, in a client that is not connected. */
export const ROAST_TEASER = {
  title: "roast",
  subtitle: "an agent, about your spotify",
  /** Delivered as bubbles, in order, from the agent. */
  lines: [
    "hi. i am going to read your listening history.",
    "then i am going to tell you what it says about you.",
    "i cannot see it yet. this part is not built.",
    "enjoy the last few weeks of not knowing.",
  ],
  /** Sits under the last bubble as the permanent typing indicator. */
  typing_label: "still thinking",
  composer_placeholder: "you do not get to reply",
  /**
   * The cap is stated on the teaser rather than saved for launch. It is the one thing
   * about this app a visitor cannot guess, and finding out at the login screen is
   * worse than finding out here.
   */
  seats_note: "Spotify caps this at 25 accounts until the app is reviewed. There will be a way to ask for one of the seats.",
} as const;

/** /lab/suggest. The only teaser in the site's own clothes. */
export const SUGGEST_TEASER = {
  title: "song suggestions",
  /**
   * The playlist is real and public now, so the note says what is actually missing,
   * which is the adding. "Playlist not open yet" stopped being true the moment the
   * header below it started rendering the live thing.
   */
  note: "you cannot add to it yet",
  lead: "Search Spotify, pick a track, and it goes straight onto a public playlist. No account, no waiting for me to approve it.",
  /** The label above the live playlist header. */
  playlist_label: "the playlist",
  /** Stands in for the cover while nothing has been fetched, or when Spotify is quiet. */
  playlist_offline: "Cannot reach the playlist right now.",
  search_label: "find a track",
  search_placeholder: "artist, or song title",
  search_hint: "Search is not connected yet.",
  submit_label: "add to playlist",
  spec: suggestSpec,
  /** Placeholder rows where the playlist will be. Deliberately not fake track names. */
  queue_label: "what is on it",
  queue_note: "The playlist will be listed here, newest first.",
  footnote: "The one app in the lab that keeps this design, because it is about the music this site already talks about.",
} as const;
