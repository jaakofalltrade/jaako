import { routes } from "@/client/endpoints";
import { DAILY_ADD_CAP, MAX_TRACK_MS, NAME_LIMITS } from "@/constants";
import { LabAppId, LabShell, LabStatus } from "@/models";
import type { LabApp, MetaPair } from "@/models";

/**
 * The lab's copy and its register of apps.
 *
 * Same split as src/data/site.ts against src/constants/site.ts: sentences live here,
 * identifiers live there. The plan every one of these entries came out of is in
 * docs/lab.md, and the teaser blocks at the foot of this file hold the copy each lab
 * page renders.
 *
 * Nothing here is a promise about a date. A status says where an app actually is, and
 * the index prints it out loud rather than implying a launch.
 */

export const LAB_INTRO = {
  index: "05",
  title: "lab",
  note: "nothing here is finished",
  /**
   * What a lab is, not what is currently in it.
   *
   * It used to be a one-line trailer for the apps below - "a slot machine, a playlist
   * you can put a song on, and an agent with opinions" - which read as a summary of a
   * list the reader was already looking at, and went stale the moment the next app
   * arrived. This describes the room instead, so it stays true however the register
   * underneath it changes. It has already outlived the trailer it replaced.
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
 * Each entry is declared on its own and then collected twice: once as the ordered
 * list the index renders, and once as a lookup so a page can ask for its own row by
 * id rather than scanning for it. Both views, one definition.
 */

const slots: LabApp = {
  id: LabAppId.Slots,
  index: "01",
  name: "slot machine",
  blurb: "Three pulls a day. Lose, or win a code you can mail me to claim.",
  status: LabStatus.Planned,
  shell: LabShell.Bare,
  href: routes.lab.slots,
  look: "arcade CRT",
};

const suggest: LabApp = {
  id: LabAppId.Suggest,
  index: "02",
  name: "song suggestions",
  blurb: "Put a track on a public playlist I actually listen to, and see what everyone else added.",
  status: LabStatus.Live,
  shell: LabShell.Site,
  href: routes.lab.suggest,
  look: "this one, unchanged",
};

const roast: LabApp = {
  id: LabAppId.Roast,
  index: "03",
  name: "judgerist",
  blurb: "An agent reads your top Spotify artists and genres, then tells you what it thinks. It is not kind.",
  status: LabStatus.Planned,
  shell: LabShell.Bare,
  href: routes.lab.roast,
  look: "messaging app",
};

const deepcuts: LabApp = {
  id: LabAppId.Deepcuts,
  index: "04",
  name: "deepcuts",
  blurb: "Rip a pack from my playlist. The fewer plays a song has, the rarer the card.",
  status: LabStatus.Planned,
  shell: LabShell.Bare,
  href: routes.lab.deepcuts,
  look: "trading card pack",
};

/** The order the index lists them in. Not alphabetical: it is the build order. */
export const LAB_APPS: LabApp[] = [slots, suggest, roast, deepcuts];

/** The same set, addressed by id, so a page can ask for its own row. */
export const LAB_APP: Record<LabAppId, LabApp> = {
  [LabAppId.Slots]: slots,
  [LabAppId.Suggest]: suggest,
  [LabAppId.Roast]: roast,
  [LabAppId.Deepcuts]: deepcuts,
};

/* ---------------- the teasers ----------------

   The unbuilt pages, each already wearing the design it will ship in. The copy is
   here rather than in the components for the same reason the rest of the site's is:
   a change of tone should be an edit to one file.

   Every one of these is written to be true today. None of them says "coming soon"
   with a date attached, because that is the one line a page like this cannot keep. */

/*
 * The readout tables are declared outside their teaser objects and typed MetaPair
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
 *
 * "approval: none, it is instant" and "duplicates: refused" are gone. Both described
 * something a visitor finds out by doing it: the track appears immediately, and a
 * duplicate is refused with a sentence saying so. A spec should carry the numbers that
 * cannot be discovered by trying, and those two were filling the table rather than
 * answering anything.
 */
/*
 * Every row is a thing a visitor cannot work out by looking at the pack, which is the
 * same bar suggestSpec is held to below.
 *
 * "plays" names its source out loud. It is the one row here that corrects an
 * assumption rather than filling one in: a page about a Spotify playlist that scores
 * cards by play count implies Spotify supplies the counts, and Spotify has never
 * exposed them. Saying so on the teaser is cheaper than a visitor deciding later that
 * the numbers are made up.
 *
 * Nothing is derived from a constant, unlike suggestSpec, because none of these
 * numbers is enforced by anything yet. When a route starts counting packs, "packs"
 * becomes a reference to whatever constant it counts against — the same move, and for
 * the same reason, as the DAILY_ADD_CAP note above.
 */
const deepcutsSpec: MetaPair[] = [
  { term: "pack", value: "5 cards" },
  { term: "packs", value: "1 / day" },
  /* Was "a playlist of mine", which was the honest answer while the page could not
     name one. The shelf lists them now, so the row points at it instead.

     "shown" rather than "below" or "above". This readout is the last block on the page
     and the shelf is several screens up from it, so "below" was simply wrong - but the
     fix is not to write "above", which pins this string to a running order that a later
     edit is free to change without ever opening this file. */
  { term: "pulled from", value: "one of the playlists shown" },
  { term: "rarity", value: "fewest plays wins" },
  { term: "plays", value: "last.fm, not spotify" },
  { term: "thresholds", value: "undecided" },
];

const suggestSpec: MetaPair[] = [
  { term: "playlist", value: "public, one of mine" },
  { term: "adds", value: `${DAILY_ADD_CAP} per person per day` },
  { term: "name", value: `${NAME_LIMITS.min} to ${NAME_LIMITS.max} characters` },
  { term: "longest track", value: `${MAX_TRACK_MS / 60_000} minutes` },
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
  footnote: "Cabinet is not built yet. Come back and pull it later.",
} as const;

/** /lab/roast. A chat that has not started, in a client that is not connected. */
export const ROAST_TEASER = {
  title: "judgerist",
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
  /** Shown while the write path is switched off. The page picks between the two. */
  note: "you cannot add to it yet",
  /** Shown once it is on. Derived, so the number cannot drift from the route's. */
  open_note: `${DAILY_ADD_CAP} a day, and it is instant`,
  /**
   * An invitation, not a description of the mechanism.
   *
   * It used to open "Search Spotify, pick a track", which is instructions for a
   * control the reader has not been offered yet and says nothing about why they would
   * want to. The ask comes first now and the mechanics follow it in one clause.
   */
  lead: "Suggest a song you like and it goes straight onto the playlist above. Search Spotify, pick a track, and it is on there: no account, and no waiting for me to approve it.",
  /** The label above the live playlist header. */
  playlist_label: "the playlist",
  /** Stands in for the cover while nothing has been fetched, or when Spotify is quiet. */
  playlist_offline: "Cannot reach the playlist right now.",
  search_label: "find a track",
  search_placeholder: "artist, or song title",
  search_hint: "Search is not connected yet.",
  submit_label: "add to playlist",
  spec: suggestSpec,
  queue_label: "what is on it",
  /**
   * The column headings. Length has no word: it is a clock icon, because the figures
   * under it are unmistakably durations and "length" over a column of 3:57 is a label
   * explaining something nobody was confused by.
   */
  columns: { title: "track", album: "album", by: "added by", when: "added" },
  /** Only when the playlist is genuinely empty, or Spotify could not be reached. */
  queue_empty: "Nothing on it yet. Be the first.",

  /**
   * The name slab, opened by the first add and skipped by every one after it.
   *
   * "sign it" was a nice phrase and a bad label: it named the gesture rather than the
   * field, so the one thing it did not say was what to type. A label on a control
   * should answer that and nothing else, and the flourish moves to the hint where it
   * costs nobody anything.
   */
  name_label: "your name",
  name_placeholder: "a name",
  // Derived, for the reason the note above suggestSpec gives: this hint sits directly
  // beside an input whose maxLength comes from the same constant.
  name_hint: `${NAME_LIMITS.min} to ${NAME_LIMITS.max} characters. It signs the track.`,

  /** While a search is in flight and there is nothing to show yet. */
  searching: "looking...",

  /**
   * What the two loading blocks announce.
   *
   * Read out, never seen: the skeletons on this page are shapes, and a shape says
   * nothing to a reader who cannot see it. One sentence per region rather than one
   * per shape, which is why these sit on the boundary and not on Skeleton itself.
   */
  loading_playlist: "Loading the playlist.",
  loading_queue: "Loading what is on the playlist.",

  /** On an optimistic row, and on one whose add came back an error with no sentence. */
  adding: "adding",
  add_failed: "That did not go through.",

  /** Under the search field when adding is switched off but reading still works. */
  closed_hint: "Not taking suggestions right now.",
  footnote: "The one app in the lab that keeps this design, because it is about the music this site already talks about.",
} as const;

/**
 * /lab/deepcuts. A pack that is still sealed, in front of a fan nobody has turned over.
 *
 * The teaser is the wrapper. Slots stops its reels and roast leaves its agent
 * permanently mid-thought; this one just never gets opened, which is the same trick
 * and the cheapest of them to make true — an unopened pack is what an unbuilt pack app
 * actually is, so nothing here has to pretend.
 *
 * The ladder is printed in full underneath, and that is deliberate rather than a way
 * to fill the page. The one thing a visitor cannot guess about this app is that the
 * rarity runs backwards, and a legend where "unheard" beats "chart" explains the whole
 * joke without opening anything.
 */
export const DEEPCUTS_TEASER = {
  title: "deepcuts",
  subtitle: "a pack, out of my playlist",
  /**
   * States the inversion in the first clause, because everything after it reads wrong
   * to anyone still assuming the hits are the prize.
   */
  lead: "Rip a pack and the songs almost nobody plays are the ones worth keeping. Five cards out of a playlist I actually listen to, scored on how few plays each track has, so a chart hit is the card you throw back and a track with four thousand plays is the pull.",

  /* pack_label, pack_series, pack_count, fan_note and card_back have gone with the
     sealed hero pack and its fan of face-down cards. The shelf prints real names and
     real counts on real wrappers now, so a made-up "series 01 / 5 cards" would be the
     one invented thing left on a page otherwise made of live data.

     The tear strip survived, because every pack on the shelf still wears it. */

  /** On the tear strip. Still true of every pack: none of them opens into a rip yet. */
  rip_label: "tear here",
  rip_note: "sealed",

  /* ---------------- the shelf, which is the live part ----------------

     THE ONE BLOCK ON THIS PAGE THAT IS NOT A TEASER, and it is here for the same
     reason the playlist header on /lab/suggest was built before anything on that page
     worked: it is the only thing about this app that can be true yet, and seeing what
     a pack would be dealt out of is most of the pitch.

     Every string below has to survive an empty shelf and a broken one, which are
     different states and get different lines. See DeepcutsLibrary in models. */

  shelf_label: "where a pack comes from",
  /**
   * Says what the list is and, in the second clause, what it is not. Without that
   * clause a reader who has just been told about five rarity rungs looks at a row of
   * playlists and reasonably assumes one of them has been scored.
   */
  shelf_note: "Read from Spotify: every playlist on my account that is public. A pack will be dealt out of one of them. None of them has been scored yet.",

  /** How many tracks are on a playlist, printed as what a pack could draw from. */
  shelf_count_one: "1 card",
  shelf_count_many: "cards",
  /* "open in spotify" USED TO BE HERE AND IS GONE. It sat under the count on every
     pack, which was four words repeated nine times down a grid to say what the cursor
     already says about a link, and it was the line that would not fit a pack's width
     without breaking. The link itself moved into the opened pack; see dialog_spotify. */

  /* ---------------- the pager ---------------- */

  pager_label: "playlists",
  pager_previous: "prev",
  pager_next: "next",
  /** {page} and {count} are filled in by Pagination. */
  pager_page: "page {page} of {count}",

  /**
   * The read worked and nothing qualified: no public playlist on the account.
   *
   * A true sentence rather than an apology. Nothing is broken in this state, and the
   * page saying "something went wrong" would be inventing a fault.
   */
  shelf_empty: "No public playlists on the account right now, so there is nothing to deal from.",

  /**
   * Read out, never seen. The skeleton is a row of shapes, and a shape says nothing to
   * a reader who cannot see it.
   */
  loading_shelf: "Loading the playlists.",

  /* ---------------- the two figures beside the title ----------------

     BOTH ARE EMPTY TODAY AND BOTH SAY SO IN WORDS. Nothing opens a pack yet, so the
     tables behind these are empty by construction rather than by accident, and the copy
     is written for that state first: "most opened: 0" would be a number answering a
     question about which playlist. See 002_deepcuts.sql. */

  /* ACROSS EVERYONE, NOT THIS VISITOR. Both figures are counted over every pack anybody
     has ever opened - the queries in server/deepcuts/store.ts group the whole table and
     filter by no visitor at all. The labels say "by everyone" because "most opened" on
     its own reads as a personal history, and a returning visitor seeing a playlist they
     have never touched would reasonably conclude the page was broken. */
  stat_most_opened: "most opened by everyone",
  stat_rarest_card: "rarest card anyone pulled",
  /** What either figure reads before anybody has opened anything. */
  stat_none: "nothing yet",
  /** The playlist has been ripped, but is no longer public, so the shelf cannot name it. */
  stat_unknown_pack: "a playlist since made private",

  /* ---------------- the tabs above the shelf ---------------- */

  tabs_label: "how deepcuts works",
  /* Ids rather than labels as the tab keys, so rewording a tab is not a state change. */
  tab_legend_id: "legend",
  tab_rules_id: "rules",
  tab_legend: "legend",
  tab_rules: "the rules, so far",
  /** Before the play count on the rarest rung, which has no floor of its own. */
  rung_under: "under",

  /* ---------------- the opened pack ---------------- */

  dialog_label: "opened",
  dialog_close: "close",
  dialog_loading: "Reading the pack.",
  dialog_failed: "That pack would not open. Try again in a moment.",
  /** Follows a count: "50 of 284 scored on last.fm plays". */
  dialog_scored: "scored on last.fm plays",
  /**
   * No last.fm key on this deployment, so nothing can be scored.
   *
   * Names the reason rather than saying the rungs are unavailable. A visitor cannot fix
   * it and is not being asked to; the sentence exists so the missing rungs read as a
   * thing that is switched off rather than a thing that is broken.
   */
  dialog_unscored: "Play counts are not switched on here, so nothing below is scored.",
  /** A track last.fm has never heard of. Not a rung, and never the rarest one. */
  dialog_unmatched: "unmatched",
  dialog_plays: "plays",
  dialog_spotify: "open the playlist in spotify",

  /**
   * Says which direction is good once, at the top of the legend, rather than trusting
   * the order of the rungs to carry it. A ladder printed commonest-first looks like
   * every other rarity ladder, and every other rarity ladder means the opposite of this
   * one.
   *
   * ladder_label and spec_label are gone: the two tabs are named "legend" and "the
   * rules, so far", so a heading inside each panel would repeat the tab just clicked.
   */
  ladder_note: "Rarest at the bottom. The fewer plays a song has, the better the card.",

  spec: deepcutsSpec,

  /**
   * The honest note about where the numbers come from, expanded from the one-word
   * spec row into the sentence that row cannot fit.
   */
  source_note: "Spotify does not publish play counts and never has, so the counts come from last.fm scrobbles. They are a decent proxy for how much of the world has heard a song, and they are not Spotify's streams.",

  footnote: "Pack is not built yet. It stays shut.",
} as const;
