import { DRIFT_MS, IDLE_REFETCH_MS, MIN_REFETCH_MS } from "@/constants";
import { Spotify } from "@/models";

/**
 * How long the player waits before asking what is playing now.
 *
 * A function rather than four lines inside the effect that schedules the timer,
 * because the interesting failure was never in the arithmetic — it was in the
 * `return` above it. The effect used to read:
 *
 *     if (!playing || !track || track.duration_ms <= 0) return;
 *
 * and a bare return from that effect does not mean "wait longer", it means NOTHING
 * IS SCHEDULED, ever again. The refetch schedule was the only thing that produced
 * the next refetch, so the moment one response came back not-playing the panel had
 * no way left to learn anything, and it froze on the last song it happened to hold.
 *
 * That is not a rare corner. Every one of these reaches it, and the first two are
 * ordinary listening:
 *
 *   - the queue or the playlist ends, so Spotify simply stops;
 *   - the listener pauses;
 *   - the timer lands inside a track change, where /me/player/currently-playing
 *     answers 204 or is_playing:false for a second or two — and the timer is aimed
 *     at exactly that moment, DRIFT_MS after the track should have ended, so this
 *     is the likeliest sample of the whole song to come back not-playing;
 *   - a podcast starts, which the panel does not request and Spotify reports as a
 *     null item;
 *   - one fetch fails and getJson returns the offline shape.
 *
 * So there is no case that answers "never" now. Not playing is a wait like any
 * other, just a fixed one, and the loop stays alive to see playback resume.
 *
 * Pure, and it takes the whole response rather than the pieces the caller pulled
 * off it, so `null` — nothing has landed yet — is an answer this can give rather
 * than a fourth thing the caller has to remember to handle. A first fetch that
 * failed is the same shape as a pause: try again shortly.
 */
export const nextRefetchMs = (args: {
  /** The last response, or null before the first one lands. */
  response: Spotify.NowPlayingResponse | null;
  /** Milliseconds since that response landed, from the local progress clock. */
  elapsed: number;
}): number => {
  const { response, elapsed } = args;
  const track = response?.track ?? null;

  // duration_ms of 0 belongs here rather than with the playing tracks: a local file
  // or an episode carries no length, so there is no end to aim at and the fixed
  // wait is the only schedule available.
  if (
    response?.status !== Spotify.PlaybackStatus.Playing ||
    !track ||
    track.duration_ms <= 0
  ) {
    return IDLE_REFETCH_MS;
  }

  // One request per song: the duration already says when this track ends, so the
  // refetch is aimed there instead of polling blindly through the middle of it.
  const remaining = track.duration_ms - (track.progress_ms + elapsed);

  // Math.max rather than clamp: the upper end has no meaning here — a long track is
  // simply a long wait — and inventing one to fit that signature would say less.
  return Math.max(MIN_REFETCH_MS, remaining + DRIFT_MS);
};
