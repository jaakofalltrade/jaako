import { describe, expect, it } from "vitest";
import { fromHost } from "./url";

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
