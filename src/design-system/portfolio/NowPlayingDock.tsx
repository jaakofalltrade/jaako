"use client";

import React, { type CSSProperties } from "react";
import { spotifyApi } from "@/client/spotifyApi";
import { PEEK_LOADING, PEEK_OFFLINE_LINES, PEEK_STATUS } from "@/constants";
import { AnnotationTone, DockState, IconName, Spotify } from "@/models";
import { clock } from "@/utils/format";
import { clamp } from "@/utils/number";
import { cx } from "@/utils/cx";
import { Annotation } from "../core/Annotation";
import { Icon } from "../Icon";

/**
 * The persistent player, bottom right, on every page and from the first paint.
 *
 * Album art is the only live imagery the site has — a photograph that changes every
 * few minutes — so it earns permanent space.
 *
 * PERMANENT IS NEW, and it is what the rest of this round follows from. The panel used
 * to wait for the masthead to scroll away before fading in, and it used to remember
 * whether you had opened it. Both were answers to the same problem: the thing was
 * either a 20rem sheet four tracks tall, which is too much to have hanging over a
 * photograph, or a bare 44px cover, which tells you nothing worth keeping on screen.
 *
 * So the minimised state was made worth looking at instead. It is a cover you can
 * actually see with the title and the artist beside it — the answer to "what is he
 * listening to" without opening anything — and at that size it can be there the whole
 * time, on the hero included. Opening it is now for the extras: the progress bar, the
 * clock, the refresh, and the three most recent plays.
 *
 * Two states, as before: minimised and open. What went is the machinery around the
 * choice between them — see the note over the component — not the choice itself.
 *
 * The playback logic is untouched. The local progress extrapolation, the one-request-
 * per-song schedule and the paused-reports-as-Recent handling were already right.
 */

/**
 * One line of a recent play — "title · album" — that scrolls itself when it does not
 * fit, instead of ending in an ellipsis.
 *
 * Overflow is measured rather than guessed, because a marquee that runs on text which
 * already fits is just motion for its own sake. scrollWidth against clientWidth is the
 * measurement; a ResizeObserver repeats it, which matters because the panel changes
 * width when it collapses to the sleeve and back.
 *
 * The distance travelled is exactly the overflow, and the duration is derived from it
 * at a fixed reading speed, so a long title takes proportionally longer rather than
 * every line racing at whatever pace suits the shortest one. The animation alternates,
 * so the line slides to its end and comes back rather than looping through a seam —
 * which is why nothing has to be duplicated in the markup here, unlike the ticker.
 *
 * Under prefers-reduced-motion the animation does not run and the line truncates, which
 * is a real loss of information and still the right trade: see widgets/_dock.scss.
 */
const SCROLL_PX_PER_SECOND = 22;

const RecentLine = ({ title, album }: { title: string; album: string }) => {
  const frame = React.useRef<HTMLSpanElement>(null);
  const line = React.useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = React.useState(0);

  React.useEffect(() => {
    const frameEl = frame.current;
    const lineEl = line.current;
    if (!frameEl || !lineEl) return;

    const measure = () =>
      setOverflow(Math.max(0, Math.ceil(lineEl.scrollWidth - frameEl.clientWidth)));

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(frameEl);
    return () => observer.disconnect();
  }, [title, album]);

  return (
    <span ref={frame} className={cx("jk-dock__recent-title", overflow > 0 && "is-scrolling")}>
      <span
        ref={line}
        className="jk-dock__recent-line"
        style={
          {
            "--scroll-by": `${overflow}px`,
            "--scroll-dur": `${Math.max(4, overflow / SCROLL_PX_PER_SECOND).toFixed(1)}s`,
          } as CSSProperties
        }
      >
        {title}
        {album ? <span className="jk-dock__recent-album">{album}</span> : null}
      </span>
    </span>
  );
};

/** Server and client clocks disagree, and Spotify samples progress_ms. */
const DRIFT_MS = 2000;

/** Floor. Without it, a short interlude or rapid skipping becomes a request storm. */
const MIN_REFETCH_MS = 10_000;

/**
 * IT ALWAYS STARTS MINIMISED, and the whole apparatus that used to decide otherwise is
 * gone with the decision.
 *
 * What was here: a localStorage key, a useSyncExternalStore-backed store with its own
 * subscriber set and a cross-tab `storage` listener, a type guard over the stored
 * string, a matchMedia query against the small breakpoint, and a function that picked
 * open on a desktop and the sleeve on a phone. All of it existed to answer one
 * question — what state does this open in — and the answer is now the same for
 * everyone every time, so none of it has anything left to do.
 *
 * That is not a feature being dropped so much as one being made unnecessary. The point
 * of remembering the choice was that the collapsed state told you nothing: a bare
 * 44px cover in the corner is not worth leaving open, so a visitor who expanded it
 * once wanted it expanded next time. The minimised state now carries the title and the
 * artist, which is the part anyone actually wanted, at a size you can read across a
 * room. Opening it is for the progress bar and the last-played list, which is a thing
 * you do when you are curious rather than a preference you hold.
 *
 * It also removes the one place on this page where the server rendered a guess. The
 * store's getServerSnapshot returned the desktop default, so a phone drew the full
 * panel and then swapped it for the sleeve on hydration. There is nothing to swap now.
 */
export const NowPlayingDock = () => {
  const [response, setResponse] = React.useState<Spotify.NowPlayingResponse | null>(null);
  /** Milliseconds since the response landed. Drives the progress bar locally. */
  const [elapsed, setElapsed] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const [dock, setDock] = React.useState<DockState>(DockState.Sleeve);
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

  /*
   * THE HERO GATE IS GONE. There used to be an IntersectionObserver here watching
   * .jk-hero, deferred a frame so the hero was measured at its settled size, with a
   * branch for the pages that have no hero at all — the whole thing so the player faded
   * in only once the masthead had scrolled away.
   *
   * The argument for it was that a fixed panel over the masthead spoils the one part of
   * the page composed as a picture, and that was a fair argument about a 20rem sheet
   * four tracks tall. It is not an argument about what is there now: minimised, this is
   * a cover and two lines of text in the corner, roughly the footprint of the gag the
   * strip below it is already making. Against that, a player that is not there when the
   * page loads is a player most visitors never learn exists.
   *
   * So it is present from the first paint, on every page, in every state. Nothing waits
   * on a scroll position any more.
   */

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

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const progress = track
    ? clamp({ value: track.progress_ms + elapsed, min: 0, max: track.duration_ms })
    : 0;
  const sleeve = dock === DockState.Sleeve;
  const recent = response?.recent ?? [];

  /*
   * The cover. One expression, used by both states, because it is the same picture in
   * both and the only difference is how big the frame around it is.
   *
   * Nothing is drawn over the artwork. The duotone filter it carried at rest — and the
   * hover/focus/press bleed back to full colour that went with it — and the spindle
   * span that put a record's centre hole over the middle are all gone. The cover is the
   * cover.
   */
  const cover = track?.album_art ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={track.album_art} alt="" className="jk-dock__art" />
  ) : (
    <Icon name={IconName.Disc} size={22} className="jk-dock__disc" />
  );

  /*
   * MINIMISED IS A REAL STATE NOW, not the panel with most of it hidden.
   *
   * It used to be exactly that: the same markup, with CSS blanking the metadata, the
   * controls and the recent list until all that was left was a 44px cover. Which is why
   * it was worth remembering that someone had opened it — a bare cover says nothing,
   * so anyone who wanted to know what was playing had to expand the thing and leave it
   * expanded.
   *
   * A separate branch is what lets it carry the title and the artist beside a cover big
   * enough to recognise, and it is a branch rather than more CSS because the collapsed
   * state is a different control: the whole strip is one button that opens the panel.
   * Under the old arrangement the text was a link to Spotify and only the cover opened
   * the player, which would put a link inside a button the moment the text became
   * visible — two targets in one strip, one of them navigating away from the page.
   *
   * The link is not lost. It is in the expanded panel, where the title has room to be a
   * link and be seen to be one.
   */
  if (sleeve) {
    /* The line above the track, and the only place the site speaks in the first
       person. Three states rather than two: the response has not landed yet, it landed
       with a track, or it landed with nothing. The first is not a playback state — see
       PEEK_LOADING — so it cannot come out of the record. */
    const status = response ? PEEK_STATUS[response.status] : PEEK_LOADING;

    return (
      <div className={cx("jk-dock", "jk-dock--sleeve", !playing && "jk-dock--idle")}>
        <button
          type="button"
          className="jk-dock__peek"
          onClick={() => setDock(DockState.Open)}
          aria-expanded={false}
          /* The whole pill read out in one string, because the visible text is
             aria-hidden below — three separate lines announced in sequence is how a
             screen reader turns a glanceable pill into a paragraph. */
          aria-label={
            track
              ? `${status} ${track.title} by ${track.artist}. Show the player`
              : `${status}. Show the player`
          }
        >
          <span className="jk-dock__sleeve" data-spin={playing ? "" : undefined}>
            {cover}
          </span>

          {/* aria-hidden because the button's own label already says all of this, and
              without it a screen reader reads the title and artist twice. */}
          <span aria-hidden="true" className="jk-dock__peek-meta">
            <span className="jk-dock__peek-status">{status}</span>
            {/* Two lines either way. When there is no track the offline copy fills the
                same two slots rather than collapsing to one, so the pill keeps its
                height whatever the answer is — see PEEK_OFFLINE_LINES. */}
            <span className="jk-dock__title">
              {track ? track.title : PEEK_OFFLINE_LINES.title}
            </span>
            <span className="jk-dock__artist">
              {track ? track.artist : PEEK_OFFLINE_LINES.artist}
            </span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={cx("jk-dock", !playing && "jk-dock--idle")}>
      <div className="jk-dock__body">
        {/* A span, not a button. It was one in both states so that pressing the cover
            could restore the collapsed player, and the collapsed player is its own
            control now — which left this as a button whose handler could never fire and
            whose label duplicated the link beside it. */}
        <span className="jk-dock__sleeve" data-spin={playing ? "" : undefined}>
          {cover}
        </span>

        <div className="jk-dock__meta">
          {track ? (
            <a href={track.url} target="_blank" rel="noreferrer" className="jk-dock__track">
              <span className="jk-dock__title">{track.title}</span>
              <span className="jk-dock__artist">{track.artist}</span>
              {/* Conditional, not optional-chained into an empty span: Spotify returns
                  no album for a local file or a podcast episode, and the service maps
                  that to "". An empty third row would leave a gap under the artist. */}
              {track.album ? <span className="jk-dock__album">{track.album}</span> : null}
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
                    "--np-progress": `${clamp({
                      value: (progress / track.duration_ms) * 100,
                      min: 0,
                      max: 100,
                    })}%`,
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
            Collapses to the minimised strip rather than unmounting. A dismissible
            element with no visible way back needs a page reload to recover, which is
            not a dismissal so much as a trap — and the strip it collapses to still says
            what is playing, so nothing is actually given up by pressing this.
          */}
          <button
            type="button"
            onClick={() => setDock(DockState.Sleeve)}
            aria-expanded
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
                  <RecentLine title={entry.title} album={entry.album} />
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
