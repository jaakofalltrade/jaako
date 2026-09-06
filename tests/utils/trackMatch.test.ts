import { describe, expect, it } from "vitest";
import { cleanTitle, primaryArtist, titleCandidates, trackKey } from "@/utils/trackMatch";

/**
 * The join between Spotify's catalogue and last.fm's.
 *
 * Every "real" case below is a track from a playlist on the account, not an invented
 * one. The two that started this file are "Destiny - Extended Mix" by
 * "Zero 7, Sia, Sophie Barker", which fails on both the artist and the title.
 */

describe("primaryArtist", () => {
  it("takes the first credit and drops the features", () => {
    expect(primaryArtist([{ name: "Zero 7" }, { name: "Sia" }, { name: "Sophie Barker" }])).toBe(
      "Zero 7"
    );
  });

  it("is the only name when there is one", () => {
    expect(primaryArtist([{ name: "Malory" }])).toBe("Malory");
  });

  it("skips a nameless first entry rather than returning empty", () => {
    expect(primaryArtist([{}, { name: "Demi Moore" }])).toBe("Demi Moore");
  });

  it("trims, because a trailing space is a different query string", () => {
    expect(primaryArtist([{ name: "  Zero 7  " }])).toBe("Zero 7");
  });

  it("is empty when there are no artists at all", () => {
    expect(primaryArtist([])).toBe("");
    expect(primaryArtist(undefined)).toBe("");
  });
});

describe("cleanTitle", () => {
  /* The case this was written for. */
  it("drops a version label after a dash", () => {
    expect(cleanTitle("Destiny - Extended Mix")).toBe("Destiny");
  });

  it("drops a remaster", () => {
    expect(cleanTitle("Paranoid Android - Remastered 2016")).toBe("Paranoid Android");
    expect(cleanTitle("Karma Police - 2011 Remaster")).toBe("Karma Police");
  });

  it("drops a radio edit and a live label", () => {
    expect(cleanTitle("Song - Radio Edit")).toBe("Song");
    expect(cleanTitle("Song - Live")).toBe("Song");
  });

  it("drops a bracketed feature credit", () => {
    expect(cleanTitle("Sunday (feat. Sia)")).toBe("Sunday");
    expect(cleanTitle("Sunday [with Sia]")).toBe("Sunday");
    expect(cleanTitle("Sunday (ft. Sia)")).toBe("Sunday");
  });

  it("handles a title carrying both decorations", () => {
    expect(cleanTitle("Sunday (feat. Sia) - Radio Edit")).toBe("Sunday");
  });

  /* KEEPS WHAT IT DOES NOT RECOGNISE. Blanket-stripping after " - " would take half of
     a real title, which is worse than not matching: a wrong query can still return a
     confident play count for the wrong song. */
  it("leaves a real title containing a dash alone", () => {
    expect(cleanTitle("Marina - Del Rey")).toBe("Marina - Del Rey");
    expect(cleanTitle("New York - Paris")).toBe("New York - Paris");
  });

  it("takes only the last dash segment, so a real dash survives a remaster label", () => {
    expect(cleanTitle("Marina - Del Rey - Remastered")).toBe("Marina - Del Rey");
  });

  it("leaves a parenthetical that is part of the title", () => {
    expect(cleanTitle("Sunday (Bloody Sunday)")).toBe("Sunday (Bloody Sunday)");
  });

  it("leaves an ordinary title untouched", () => {
    expect(cleanTitle("silence flows thruogh noise")).toBe("silence flows thruogh noise");
    expect(cleanTitle("Do You Love Me")).toBe("Do You Love Me");
  });

  it("trims surrounding space", () => {
    expect(cleanTitle("  Destiny - Extended Mix  ")).toBe("Destiny");
  });

  /* Not a real track, but a shape a malformed response can produce. Asking last.fm
     about "" is a wasted request with a guaranteed answer. */
  it("never strips a title down to nothing", () => {
    expect(cleanTitle("- Remastered")).not.toBe("");
    expect(cleanTitle("(feat. Sia)")).not.toBe("");
  });
});

describe("titleCandidates", () => {
  it("is one query when there was nothing to strip", () => {
    expect(titleCandidates("Do You Love Me")).toEqual(["Do You Love Me"]);
  });

  /* Cleaned first because it matches far more often; raw second for the track that is
     genuinely filed under its whole decorated name. */
  it("tries the cleaned title before the raw one", () => {
    expect(titleCandidates("Destiny - Extended Mix")).toEqual([
      "Destiny",
      "Destiny - Extended Mix",
    ]);
  });

  it("never repeats a query", () => {
    for (const title of [
      "Do You Love Me",
      "Destiny - Extended Mix",
      "Sunday (feat. Sia) - Radio Edit",
      "Marina - Del Rey",
    ]) {
      const candidates = titleCandidates(title);
      expect(new Set(candidates).size, title).toBe(candidates.length);
    }
  });

  it("never asks about an empty string", () => {
    for (const title of ["- Remastered", "(feat. Sia)", "  "]) {
      expect(titleCandidates(title).every((c) => c.length > 0), title).toBe(true);
    }
  });

  /* A blank title has nothing to ask about, so it asks nothing. The caller reads an
     empty list as unmatched rather than spending a request on "". */
  it("has no candidates at all for a blank title", () => {
    expect(titleCandidates("   ")).toEqual([]);
    expect(titleCandidates("")).toEqual([]);
  });
});

/**
 * The key that decides two playlist entries are one song.
 *
 * IT EXISTS BECAUSE OF A MEASURED BUG. "strangers" holds "did i tell u that i miss u" by
 * adore twice, under two different Spotify uris, and both were scored, both sat in the
 * draw pool, and a five card pack could deal the same song twice. De-duplicating on the
 * uri does not fix that, because Spotify considers the two different tracks.
 */
describe("trackKey", () => {
  /* THE CASE IT WAS WRITTEN FOR. Same recording, two uris, and nothing about the strings
     differs - so if this ever stops collapsing, packs deal doubles again. */
  it("collapses one song listed twice", () => {
    expect(trackKey({ title: "did i tell u that i miss u", artist: "adore" })).toBe(
      trackKey({ title: "did i tell u that i miss u", artist: "adore" })
    );
  });

  /* The decoration stripping is shared with the last.fm lookup on purpose: both spellings
     ask last.fm the same question and come back with one count, so they are one card. */
  it("collapses a version label onto the plain title", () => {
    expect(trackKey({ title: "Destiny - Extended Mix", artist: "Zero 7" })).toBe(
      trackKey({ title: "Destiny", artist: "Zero 7" })
    );
  });

  it("ignores case and surrounding space", () => {
    expect(trackKey({ title: "  Pale Blue Eyes ", artist: "The Velvet Underground" })).toBe(
      trackKey({ title: "pale blue eyes", artist: "the velvet underground" })
    );
  });

  /* AND THE OTHER DIRECTION, WHICH IS THE ONE THAT COSTS A PLAYLIST SONGS IF IT BREAKS.
     Over-collapsing silently drops tracks from the pool, so two genuinely different
     songs must not share a key. */
  it("keeps two different songs apart", () => {
    expect(trackKey({ title: "Baiana", artist: "Barbatuques" })).not.toBe(
      trackKey({ title: "Magalenha", artist: "Barbatuques" })
    );

    expect(trackKey({ title: "Numbers", artist: "TEMPOREX" })).not.toBe(
      trackKey({ title: "Numbers", artist: "Daft Punk" })
    );
  });

  /* A title that is nothing BUT decoration would clean to an empty string, and an empty
     key would collapse every such track onto one card. cleanTitle's fallback to the raw
     title is what stops that, and this is the test that keeps it. */
  it("falls back to the raw title rather than keying on nothing", () => {
    const dashOnly = trackKey({ title: "- Remastered", artist: "Someone" });
    const other = trackKey({ title: "- Live", artist: "Someone" });

    expect(dashOnly).not.toBe("someone|");
    expect(dashOnly).not.toBe(other);
  });
});
