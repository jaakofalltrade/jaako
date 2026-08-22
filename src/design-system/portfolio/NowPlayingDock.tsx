"use client";

import React, { type CSSProperties } from "react";
import { spotifyApi } from "@/api/spotifyApi";
import { AnnotationTone, DockState, IconName, Spotify } from "@/models";
import { clock } from "@/utils/format";
import { cx } from "@/utils/cx";
import { Annotation } from "../core/Annotation";
import { Icon } from "../Icon";

/**
 * The persistent player, on the right-hand side.
 *
 * Album art is the only live imagery the site has — a photograph that changes every
 * few minutes — so it earns permanent space.
 *
 * Two changes from the docked version. It sits on the right rather than the
 * bottom-left, and the three most recent plays are always on show instead of living
 * behind an expand toggle. The route has been returning them all along (RECENT_SHOWN
 * is 3 in constants/spotify.ts); they were just hidden by default.
 *
 * Dropping the toggle removed a control, a third enum member, an aria-expanded
 * relationship and a branch in the render, to save about 90px of height. The panel
 * has two states left: open, and shrunk to the bare sleeve.
 *
 * The playback logic is unchanged — the local progress extrapolation and the
 * paused-reports-as-Recent handling were already the right calls.
 */

/** Where the open/sleeve choice is remembered between visits. */
const STORAGE_KEY = "jk-dock";

/** Server and client clocks disagree, and Spotify samples progress_ms. */
const DRIFT_MS = 2000;

/** Floor. Without it, a short interlude or rapid skipping becomes a request storm. */
const MIN_REFETCH_MS = 10_000;

const isDockState = (value: string | null): value is DockState =>
  value === DockState.Open || value === DockState.Sleeve;

/** Matches the $bp-sm breakpoint in base/_mixins.scss. */
const MOBILE = "(max-width: 47.9375rem)";

/**
 * What a visitor with no stored preference gets.
 *
 * Open on a desktop, the sleeve on a phone. The panel is now permanently four tracks
 * tall, and defaulting that open on a 390px screen would park a fixed sheet over most
 * of whatever section was being read — the recent list being always-on is what makes
 * this branch necessary, since the old collapsed default already covered it.
 */
const defaultDockState = (): DockState =>
  window.matchMedia(MOBILE).matches ? DockState.Sleeve : DockState.Open;

/**
 * The open/sleeve choice, read straight out of localStorage.
 *
 * useSyncExternalStore rather than useState-plus-useEffect because that is exactly
 * what localStorage is: an external store. It also solves the hydration problem for
 * free — getServerSnapshot returns the default, so the server and the first client
 * render agree, and React swaps in the stored value without a mismatch warning.
 *
 * The listener set exists because the `storage` event only fires in *other* tabs.
 * Notifying locally is what makes a write in this tab re-render this component; the
 * cross-tab sync that falls out of it is a small bonus rather than the point.
 */
const dockStore = (() => {
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      window.addEventListener("storage", notify);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", notify);
      };
    },
    read: (): DockState => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return isDockState(stored) ? stored : defaultDockState();
    },
    // The server cannot know the viewport, so it renders the desktop default. That is
    // not a hydration mismatch: getServerSnapshot is used for the server render and
    // for hydration alike, and React then re-renders with the client snapshot — which
    // is exactly the case useSyncExternalStore exists to handle.
    readServer: (): DockState => DockState.Open,
    write: (next: DockState) => {
      window.localStorage.setItem(STORAGE_KEY, next);
      notify();
    },
  };
})();

export const NowPlayingDock = () => {
  const [response, setResponse] = React.useState<Spotify.NowPlayingResponse | null>(null);
  /** Milliseconds since the response landed. Drives the progress bar locally. */
  const [elapsed, setElapsed] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const dock = React.useSyncExternalStore(
    dockStore.subscribe,
    dockStore.read,
    dockStore.readServer,
  );
  const [pastHero, setPastHero] = React.useState(false);
  const [tabVisible, setTabVisible] = React.useState(true);

  const track = response?.track ?? null;
  const playing = response?.status === Spotify.PlaybackStatus.Playing;

  const load = React.useCallback(async (signal?: AbortSignal) => {
    const next = await spotifyApi.nowPlaying({ signal });
    if (signal?.aborted) return;
    setResponse(next);
    setElapsed(0);
  }, []);

  // The promise form rather than `load(signal)` on purpose: the state update belongs
  // in the callback, where it is plainly asynchronous, instead of looking like a
  // synchronous setState in an effect body.
  React.useEffect(() => {
    const controller = new AbortController();

    spotifyApi.nowPlaying({ signal: controller.signal }).then((next) => {
      if (controller.signal.aborted) return;
      setResponse(next);
      setElapsed(0);
    });

    return () => controller.abort();
  }, []);

  /**
   * The player appears only once the hero has scrolled away.
   *
   * Waiting makes the arrival read as deliberate rather than as something that was
   * hiding there all along, and it keeps a fixed panel off the masthead, which is the
   * one part of the page composed as a picture.
   */
  React.useEffect(() => {
    let observer: IntersectionObserver | undefined;

    // Deferred a frame rather than run in the effect body. Two reasons: the layout has
    // settled by then, so the hero is measured at its real size; and it keeps the
    // no-hero branch from being a synchronous setState during an effect.
    const frame = requestAnimationFrame(() => {
      const hero = document.querySelector(".jk-hero");

      // Pages without a hero (/work, /work/[slug]) get the player immediately.
      if (!hero) {
        setPastHero(true);
        return;
      }

      observer = new IntersectionObserver(([entry]) => setPastHero(!entry.isIntersecting), {
        threshold: 0,
      });
      observer.observe(hero);
    });

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, []);

  // Nothing is scheduled while the tab is in the background.
  React.useEffect(() => {
    const onChange = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  /**
   * One request per song rather than one every thirty seconds.
   *
   * The duration already tells us when the track ends, so the refetch is scheduled for
   * that moment instead of polling blindly. Both guards matter: the drift margin
   * because the two clocks disagree, and the floor because skipping rapidly through
   * tracks would otherwise fire a request per skip.
   */
  React.useEffect(() => {
    if (!playing || !track || track.duration_ms <= 0 || !tabVisible) return;

    const remaining = track.duration_ms - (track.progress_ms + elapsed);
    const delay = Math.max(MIN_REFETCH_MS, remaining + DRIFT_MS);

    const id = setTimeout(() => load(), delay);
    return () => clearTimeout(id);
    // elapsed is deliberately excluded from the deps: including it would tear down and
    // reschedule this timer every single second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, track, tabVisible, load]);

  // Advance the progress bar locally so it is not frozen at the load-time value.
  // Costs no network.
  React.useEffect(() => {
    if (!playing || !track) return;

    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [playing, track]);

  const setDockState = (next: DockState) => dockStore.write(next);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const progress = track ? Math.min(track.progress_ms + elapsed, track.duration_ms) : 0;
  const sleeve = dock === DockState.Sleeve;
  const recent = response?.recent ?? [];

  return (
    <div
      className={cx(
        "jk-dock",
        pastHero && "jk-dock--in",
        sleeve && "jk-dock--sleeve",
        !playing && "jk-dock--idle",
      )}
    >
      <div className="jk-dock__body">
        {/*
          The sleeve is a button in every state: pressing it is what restores the
          player once it has been collapsed down to the bare cover.

          Nothing is drawn over the artwork any more. The duotone filter it carried at
          rest — and the hover/focus/press bleed back to full colour that went with it
          — and the spindle span that put a record's centre hole over the middle are
          both gone. The cover is the cover.
        */}
        <button
          type="button"
          className="jk-dock__sleeve"
          data-spin={playing ? "" : undefined}
          onClick={() => sleeve && setDockState(DockState.Open)}
          aria-label={
            sleeve
              ? "Show the player"
              : track
                ? `${track.title} by ${track.artist}`
                : "Nothing playing"
          }
        >
          {track?.album_art ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={track.album_art} alt="" className="jk-dock__art" />
          ) : (
            <Icon name={IconName.Disc} size={18} className="jk-dock__disc" />
          )}
        </button>

        <div className="jk-dock__meta">
          {track ? (
            <a href={track.url} target="_blank" rel="noreferrer" className="jk-dock__track">
              <span className="jk-dock__title">{track.title}</span>
              <span className="jk-dock__artist">{track.artist}</span>
            </a>
          ) : (
            <span className="jk-dock__idle">
              {response ? "not listening" : "reading the turntable"}
            </span>
          )}

          {track && track.duration_ms > 0 ? (
            <>
              <span
                className="jk-dock__bar"
                style={
                  {
                    "--np-progress": `${Math.min(100, (progress / track.duration_ms) * 100)}%`,
                  } as CSSProperties
                }
              >
                <span aria-hidden="true" className="jk-dock__bar-fill" />
              </span>
              <span className="jk-dock__clock">
                {clock(progress)} / {clock(track.duration_ms)}
              </span>
            </>
          ) : null}
        </div>

        <div className="jk-dock__controls">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh now playing"
            className="jk-dock__key"
          >
            <Icon name={IconName.RefreshCw} size={11} spin={refreshing} />
          </button>
          {/*
            Collapses to the bare sleeve rather than unmounting. A dismissible element
            with no visible way back needs a page reload to recover, which is not a
            dismissal so much as a trap.
          */}
          <button
            type="button"
            onClick={() => setDockState(DockState.Sleeve)}
            aria-label="Collapse the player"
            className="jk-dock__key"
          >
            &times;
          </button>
        </div>
      </div>

      {recent.length > 0 ? (
        <>
          <Annotation tone={AnnotationTone.Info} className="jk-dock__recent-head">
            last played
          </Annotation>
          <ol className="jk-dock__recent">
            {recent.map((entry, index) => (
              <li key={`${entry.url}-${index}`} className="jk-dock__recent-row">
                <span aria-hidden="true" className="jk-dock__recent-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                  className="jk-dock__recent-link"
                >
                  <span className="jk-dock__recent-title">{entry.title}</span>
                  <span className="jk-dock__recent-artist">{entry.artist}</span>
                </a>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </div>
  );
};
