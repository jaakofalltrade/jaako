import { describe, expect, it } from "vitest";
import { DRIFT_MS, IDLE_REFETCH_MS, MIN_REFETCH_MS } from "@/constants";
import { Spotify } from "@/models";
import { nextRefetchMs } from "@/utils/nowPlayingSchedule";

const track = (over: Partial<Spotify.Track> = {}): Spotify.Track => ({
  title: "My Jinji",
  artist: "Sunset Rollercoaster",
  album: "JINJI KIKKO",
  album_art: null,
  url: "https://open.spotify.com/track/59Bc4RPzSL3nYPANh25a6J",
  duration_ms: 400_560,
  progress_ms: 0,
  ...over,
});

const response = (
  status: Spotify.PlaybackStatus,
  over: Partial<Spotify.Track> = {},
): Spotify.NowPlayingResponse => ({ status, track: track(over), recent: [] });

describe("nextRefetchMs", () => {
  describe("while a track is playing", () => {
    it("aims at the end of the track, plus the drift margin", () => {
      const delay = nextRefetchMs({
        response: response(Spotify.PlaybackStatus.Playing, {
          duration_ms: 400_560,
          progress_ms: 100_000,
        }),
        elapsed: 0,
      });

      expect(delay).toBe(300_560 + DRIFT_MS);
    });

    it("subtracts the time counted locally since the response landed", () => {
      const delay = nextRefetchMs({
        response: response(Spotify.PlaybackStatus.Playing, {
          duration_ms: 400_560,
          progress_ms: 100_000,
        }),
        elapsed: 30_000,
      });

      expect(delay).toBe(270_560 + DRIFT_MS);
    });

    it("holds the floor when the track is nearly over, so skipping is not a request storm", () => {
      const delay = nextRefetchMs({
        response: response(Spotify.PlaybackStatus.Playing, {
          duration_ms: 200_000,
          progress_ms: 199_000,
        }),
        elapsed: 0,
      });

      expect(delay).toBe(MIN_REFETCH_MS);
    });

    it("holds the floor rather than going negative when the clock has overrun", () => {
      const delay = nextRefetchMs({
        response: response(Spotify.PlaybackStatus.Playing, {
          duration_ms: 200_000,
          progress_ms: 150_000,
        }),
        elapsed: 90_000,
      });

      expect(delay).toBe(MIN_REFETCH_MS);
    });

    it("falls back to the idle wait for a track with no length, which is a local file or an episode", () => {
      const delay = nextRefetchMs({
        response: response(Spotify.PlaybackStatus.Playing, { duration_ms: 0 }),
        elapsed: 0,
      });

      expect(delay).toBe(IDLE_REFETCH_MS);
    });
  });

  /* THE REGRESSION. Each of these used to schedule nothing at all, and scheduling
     nothing in this panel is permanent: the timer is what produces the next request,
     so the panel stopped answering for the rest of the page's life. Every case here
     is reached by ordinary listening — the first one is simply a song ending. */
  describe("when nothing is playing", () => {
    it("keeps asking after a pause or a finished queue", () => {
      expect(
        nextRefetchMs({
          response: response(Spotify.PlaybackStatus.Recent),
          elapsed: 0,
        }),
      ).toBe(IDLE_REFETCH_MS);
    });

    it("keeps asking after a failed fetch, so one blip is not permanent", () => {
      expect(
        nextRefetchMs({
          response: { status: Spotify.PlaybackStatus.Offline, track: null, recent: [] },
          elapsed: 0,
        }),
      ).toBe(IDLE_REFETCH_MS);
    });

    it("keeps asking when a status arrives without a track", () => {
      expect(
        nextRefetchMs({
          response: { status: Spotify.PlaybackStatus.Playing, track: null, recent: [] },
          elapsed: 0,
        }),
      ).toBe(IDLE_REFETCH_MS);
    });

    it("keeps asking before the first response has landed", () => {
      expect(nextRefetchMs({ response: null, elapsed: 0 })).toBe(IDLE_REFETCH_MS);
    });

    it("never answers with a wait a page can outlive", () => {
      for (const status of Object.values(Spotify.PlaybackStatus)) {
        const delay = nextRefetchMs({ response: response(status), elapsed: 0 });
        expect(Number.isFinite(delay)).toBe(true);
        expect(delay).toBeGreaterThan(0);
      }
    });
  });
});
