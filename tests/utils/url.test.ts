import { describe, expect, it } from "vitest";
import { fromHost, fromHostList } from "@/utils/url";

const HOST = "open.spotify.com";

describe("fromHost", () => {
  it("returns a URL served from the host", () => {
    const url = "https://open.spotify.com/track/abc";
    expect(fromHost({ url, host: HOST, fallback: null })).toBe(url);
  });

  it("refuses a different host", () => {
    expect(fromHost({ url: "https://example.test/track/abc", host: HOST, fallback: null })).toBeNull();
  });

  /* The comparison is on hostname, so it is exact. This is the trick a startsWith or
     an includes check would wave through, and it is why the doc comment names it. */
  it("refuses a host that merely starts with the allowed one", () => {
    const url = "https://open.spotify.com.example.test/track/abc";
    expect(fromHost({ url, host: HOST, fallback: null })).toBeNull();
  });

  /* These parse with an empty hostname rather than throwing, so they fail the
     comparison without needing a scheme check of their own. */
  it("refuses javascript: and data: URLs", () => {
    expect(fromHost({ url: "javascript:alert(1)", host: HOST, fallback: null })).toBeNull();
    expect(fromHost({ url: "data:text/html,<b>x</b>", host: HOST, fallback: null })).toBeNull();
  });

  it("refuses anything unparseable", () => {
    expect(fromHost({ url: "not a url", host: HOST, fallback: null })).toBeNull();
  });

  it("takes the fallback for undefined and for the empty string", () => {
    expect(fromHost({ url: undefined, host: HOST, fallback: null })).toBeNull();
    expect(fromHost({ url: "", host: HOST, fallback: null })).toBeNull();
  });

  /* Generic in the fallback so a caller can pick the type of "no": null where the
     value feeds an optional field, another URL where something has to render. */
  it("hands back whatever fallback it was given", () => {
    const fallback = "https://open.spotify.com";
    expect(fromHost({ url: "https://example.test", host: HOST, fallback })).toBe(fallback);
  });

  it("ignores the port and the path when comparing", () => {
    const url = "https://open.spotify.com/artist/xyz?si=1";
    expect(fromHost({ url, host: HOST, fallback: null })).toBe(url);
  });
});

describe("fromHostList", () => {
  const hosts = ["i.scdn.co"] as const;
  const suffixes = [".spotifycdn.com"] as const;
  const call = (url: string | undefined) =>
    fromHostList({ url, hosts, suffixes, fallback: null });

  it("accepts an exact host", () => {
    expect(call("https://i.scdn.co/image/abc")).toBe("https://i.scdn.co/image/abc");
  });

  /* The case that forced this to exist: the same playlist cover answered as
     image-cdn-ak and image-cdn-fa on two consecutive requests, so an exact list
     cannot hold it. */
  it("accepts either rotating subdomain under the suffix", () => {
    const ak = "https://image-cdn-ak.spotifycdn.com/image/abc";
    const fa = "https://image-cdn-fa.spotifycdn.com/image/abc";
    expect(call(ak)).toBe(ak);
    expect(call(fa)).toBe(fa);
  });

  /* The whole safety of a suffix check is the leading dot. Without it this hostname
     would pass, which is the same mistake as checking a URL with startsWith. */
  it("refuses a lookalike domain that merely ends with the same letters", () => {
    expect(call("https://evilspotifycdn.com/image/abc")).toBeNull();
  });

  /* A suffix with no leading dot is treated as a mistake and matches nothing, rather
     than being quietly widened into the hole above. */
  it("ignores a suffix that does not begin with a dot", () => {
    expect(
      fromHostList({
        url: "https://evilspotifycdn.com/x",
        hosts: [],
        suffixes: ["spotifycdn.com"],
        fallback: null,
      })
    ).toBeNull();
  });

  it("refuses the bare suffix domain itself", () => {
    expect(call("https://spotifycdn.com/image/abc")).toBeNull();
  });

  it("refuses an unrelated host", () => {
    expect(call("https://example.test/image/abc")).toBeNull();
  });

  it("refuses javascript: and unparseable URLs", () => {
    expect(call("javascript:alert(1)")).toBeNull();
    expect(call("not a url")).toBeNull();
    expect(call(undefined)).toBeNull();
  });

  it("works with no suffixes at all, which is how fromHost uses it", () => {
    expect(
      fromHostList({ url: "https://i.scdn.co/x", hosts, suffixes: [], fallback: null })
    ).toBe("https://i.scdn.co/x");
  });
});
