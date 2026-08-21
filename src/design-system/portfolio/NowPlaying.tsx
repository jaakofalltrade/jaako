"use client";

import React, { type CSSProperties } from "react";
import { Badge, type BadgeTone } from "@/design-system/core/Badge";
import { Icon } from "@/design-system/Icon";
// Type-only import: erased at compile time, so no server code reaches the bundle.
import type { NowPlayingPayload, NowPlayingStatus, NowPlayingTrack } from "@/lib/spotify";

/** Matches .jk-now-playing__cover in src/styles/widgets/_now-playing.scss. */
const ART_INNER = 68;

const STATUS: Record<NowPlayingStatus | "loading", { label: string; tone: BadgeTone }> = {
  playing: { label: "now playing", tone: "green" },
  recent: { label: "last played", tone: "void" },
  offline: { label: "offline", tone: "void" },
  loading: { label: "tuning in", tone: "steel" },
};

function clock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Album cover as a record: circular, spinning while audio is actually playing,
 * desaturated and still otherwise. Falls back to the disc icon when the track
 * has no artwork, or before data lands.
 */
function Art({ track, spinning }: { track: NowPlayingTrack | null; spinning: boolean }) {
  return (
    <div className="jk-now-playing__art">
      {track?.albumArt ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={track.albumArt}
            alt={track.album ? `${track.album} album cover` : ""}
            width={ART_INNER}
            height={ART_INNER}
            data-spin={spinning ? "" : undefined}
            className="jk-now-playing__cover"
          />
          <span aria-hidden="true" className="jk-now-playing__spindle" />
        </>
      ) : (
        <Icon name="disc" size={30} className="jk-now-playing__disc" />
      )}
    </div>
  );
}

export function NowPlaying() {
  const [data, setData] = React.useState<NowPlayingPayload | null>(null);
  /** Milliseconds since the payload landed. Drives the progress bar; see below. */
  const [elapsed, setElapsed] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);

  // One fetch on mount — deliberately no polling; the refresh button covers the rest.
  React.useEffect(() => {
    let ignore = false;
    fetch("/api/spotify/now-playing")
      .then((r) => r.json())
      .then((payload: NowPlayingPayload) => {
        if (!ignore) setData(payload);
      })
      .catch(() => {
        if (!ignore) setData({ status: "offline", track: null, recent: [] });
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const r = await fetch("/api/spotify/now-playing", { cache: "no-store" });
      const payload: NowPlayingPayload = await r.json();
      setData(payload);
      setElapsed(0);
    } catch {
      setData({ status: "offline", track: null, recent: [] });
    } finally {
      setRefreshing(false);
    }
  }

  // Advance the progress bar locally so it isn't frozen at the load-time value.
  // Costs no network. Only the interval writes state — the position itself is
  // derived below, which keeps this effect free of a synchronous setState.
  React.useEffect(() => {
    if (data?.status !== "playing" || !data.track) return;
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [data]);

  const status = data?.status ?? "loading";
  const badge = STATUS[status];
  const track = data?.track ?? null;
  const playing = status === "playing";
  // Extrapolated from the load-time position; capped so it stops at the end of
  // the track instead of running past it.
  const progress = track ? Math.min(track.progressMs + elapsed, track.durationMs) : 0;

  return (
    <div className="jk-now-playing">
      <button
        type="button"
        onClick={refresh}
        disabled={refreshing}
        aria-label="Refresh now playing"
        title="Refresh now playing"
        className="jk-now-playing__refresh"
      >
        <Icon name="refresh-cw" size={12} spin={refreshing} />
      </button>

      <div className="jk-now-playing__head">
        <Art track={track} spinning={playing} />

        <div className="jk-now-playing__meta">
          <Badge tone={badge.tone} className="jk-now-playing__badge">
            {badge.label}
          </Badge>

          {track ? (
            <a href={track.url} target="_blank" rel="noreferrer" className="jk-now-playing__track">
              <span className="jk-now-playing__title">{track.title}</span>
              <span className="jk-now-playing__artist">{track.artist}</span>
            </a>
          ) : (
            <span className="jk-now-playing__idle">
              {status === "loading" ? "reading the turntable…" : "nothing on the decks"}
            </span>
          )}

          {playing && track && track.durationMs > 0 ? (
            <div className="jk-now-playing__progress">
              <div className="jk-now-playing__bar">
                <div
                  className="jk-now-playing__bar-fill"
                  style={
                    {
                      "--np-progress": `${Math.min(100, (progress / track.durationMs) * 100)}%`,
                    } as CSSProperties
                  }
                />
              </div>
              <span className="jk-now-playing__clock">
                {clock(progress)} / {clock(track.durationMs)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {data?.recent.length ? (
        <div className="jk-now-playing__recent">
          <span className="jk-now-playing__recent-label">recently</span>
          {data.recent.map((t, i) => (
            <a
              key={`${t.url}-${i}`}
              href={t.url}
              target="_blank"
              rel="noreferrer"
              className="jk-now-playing__recent-item"
            >
              <Icon name="disc" />
              <span className="jk-now-playing__recent-name">
                {t.artist} · {t.title}
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
