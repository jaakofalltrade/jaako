import { describe, expect, it } from "vitest";
import { cleanTitle, primaryArtist, titleCandidates } from "@/utils/trackMatch";

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
