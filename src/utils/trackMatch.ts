/**
 * Turning a Spotify track into something last.fm will recognise.
 *
 * THE TWO CATALOGUES DISAGREE ABOUT WHAT A SONG IS CALLED, and last.fm has no id we
 * share with Spotify: no ISRC lookup, no Spotify id, nothing. `track.getInfo` matches on
 * an artist string and a title string, so the join is a pair of names and the whole
 * problem is getting those two names into the shape last.fm files them under.
 *
 * Both failures below are real, taken from one playlist on the account:
 *
 *   artist   Spotify credits every performer. "Destiny - Extended Mix" comes back as
 *            "Zero 7, Sia, Sophie Barker". last.fm files it under "Zero 7" alone, and a
 *            comma-joined string matches nothing at all - not a near miss, a zero.
 *   title    Spotify decorates. "Destiny - Extended Mix", "Song - Remastered 2011",
 *            "Song (feat. X)". last.fm's canonical track is usually the bare title.
 *
 * Pure and dependency-free, so the rules can be argued about and pinned by tests without
 * a network. What to DO with the candidates is server/lastfm's business.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not fuzzy-match, score similarity or pick
 * between near-identical strings. last.fm's own `autocorrect=1` handles spelling,
 * casing and punctuation better than anything written here could, and a similarity
 * threshold is how the wrong recording gets a confident-looking play count. This strips
 * the structural decoration and then asks; anything still unmatched stays unmatched,
 * which rarityOf turns into no rung rather than a guess.
 */

/**
 * The artist last.fm files the track under: the first one Spotify credits.
 *
 * FIRST, NOT JOINED, AND NOT ALL OF THEM TRIED IN TURN. Spotify orders the array with
 * the primary artist first and features after, and that primary is what both catalogues
 * agree the song belongs to. Trying each credited artist in turn would multiply the
 * request count by three to find the same answer, and would happily return the featured
 * artist's own different song of the same name.
 *
 * Note this is NOT what the page prints. `artistNames` in server/spotify/mappers.ts
 * still joins every credit for display, because a reader wants to see who is on it.
 * Display and matching are different jobs on the same field.
 */
export const primaryArtist = (artists: { name?: string }[] | undefined): string =>
  artists?.map((artist) => artist.name?.trim()).find(Boolean) ?? "";

/**
 * Tails after " - " that are a version label rather than part of the title.
 *
 * SPOTIFY USES " - " AS ITS OWN VERSION SEPARATOR, which is what makes this tractable:
 * the decoration is nearly always after that exact string. It is still checked against
 * this list rather than stripped blindly, because a real title can contain a hyphen
 * surrounded by spaces and losing half of it would be worse than not matching.
 */
const DECORATION = [
  /remaster/i,
  /\bmix$/i,
  /\bversion$/i,
  /\bedit$/i,
  /\bremix$/i,
  /^instrumental$/i,
  /^acoustic\b/i,
  /^demo$/i,
  /^live\b/i,
  /^mono$/i,
  /^stereo$/i,
  /^bonus track$/i,
  /^single$/i,
  /^original$/i,
  /^radio\b/i,
  /^extended\b/i,
  /^from\b/i,
  /^feat\.?\b/i,
  /^ft\.?\b/i,
  /^with\b/i,
];

const isDecoration = (tail: string): boolean =>
  DECORATION.some((pattern) => pattern.test(tail.trim()));

/** `(feat. X)`, `[with Y]`, and the version labels above when they arrive in brackets. */
const BRACKETED = /\s*[([]([^)\]]*)[)\]]\s*$/;

/**
 * The title with Spotify's decoration taken off, or the title unchanged.
 *
 * Applied repeatedly, because a title can carry both: "Song (feat. X) - Radio Edit"
 * needs two passes and stops when a pass changes nothing. Bounded rather than `while
 * (true)`, so a pattern that somehow matches its own output cannot spin.
 *
 * NEVER RETURNS AN EMPTY STRING. A title that is nothing but a decoration - which is
 * not a real track, but is a shape a malformed response can produce - keeps whatever it
 * had, because asking last.fm about "" is a wasted request with a guaranteed answer.
 */
export const cleanTitle = (title: string): string => {
  let value = title.trim();

  for (let pass = 0; pass < 3; pass += 1) {
    const before = value;

    /* The LAST " - " rather than the first: "Marina - Del Rey - Remastered" loses the
       remaster and keeps the name. */
    const dash = value.lastIndexOf(" - ");
    if (dash > 0 && isDecoration(value.slice(dash + 3))) {
      value = value.slice(0, dash).trim();
    }

    const bracket = BRACKETED.exec(value);
    if (bracket && isDecoration(bracket[1])) {
      value = value.slice(0, bracket.index).trim();
    }

    if (value === before) break;
  }

  return value || title.trim();
};

/**
 * The titles to ask last.fm about, in order, stopping at the first that answers.
 *
 * CLEANED FIRST, RAW SECOND. The cleaned form matches far more often, and the raw form
 * is the fallback for the case this file cannot see coming: a track genuinely called
 * "Something - Live" that last.fm also files under that whole string. Two requests at
 * worst, and only for a track the first attempt missed.
 *
 * One entry when cleaning changed nothing, which is most tracks, and NONE for a title
 * that is blank. An empty list means "do not ask", which the caller reads as unmatched -
 * the honest answer, and better than spending a request on "" to be told nothing.
 */
export const titleCandidates = (title: string): string[] => {
  const cleaned = cleanTitle(title);
  const raw = title.trim();

  return [...new Set([cleaned, raw])].filter(Boolean);
};

/**
 * The key two playlist entries share when they are the same song.
 *
 * WHY THIS IS THE RIGHT KEY, AND WHY THE SPOTIFY URI IS NOT. A playlist can hold one
 * recording twice under two different uris - the album pressing and a compilation's, or
 * an original and its remaster - and Spotify considers those different tracks. This app
 * cannot: both ask last.fm the identical question, get back the identical play count,
 * and land on the identical rung. Two cards with the same title, the same artist and the
 * same number on them are the same card, whatever the uri says.
 *
 * Measured on a real playlist: "strangers" carries "did i tell u that i miss u" by adore
 * twice, under two uris, and a pack could be dealt both of them.
 *
 * IT IS THE LAST.FM QUERY ITSELF, deliberately, rather than a key invented for the job.
 * Two entries collapse here exactly when the app would ask about them identically, so
 * the rule cannot drift from the thing it is a proxy for. It also means the decoration
 * stripping is shared: "Destiny" and "Destiny - Extended Mix" are one key, which is
 * correct, because last.fm answers with one count for both.
 *
 * Lowercased, because a difference of case is never a difference of song.
 */
export const trackKey = (args: { title: string; artist: string }): string =>
  `${args.artist.trim()}|${cleanTitle(args.title) || args.title.trim()}`.toLowerCase();
