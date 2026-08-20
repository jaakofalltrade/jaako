"use client";

import React from "react";
import { Badge, type BadgeTone } from "@/design-system/core/Badge";
import { Icon } from "@/design-system/Icon";
// Type-only import: erased at compile time, so no server code reaches the bundle.
import type { NowPlayingPayload, NowPlayingStatus, NowPlayingTrack } from "@/lib/spotify";

const ART = 76;

const STATUS: Record<NowPlayingStatus | "loading", { label: string; tone: BadgeTone; blink: boolean }> = {
  playing: { label: "now playing", tone: "green", blink: true },
  recent: { label: "last played", tone: "void", blink: false },
  offline: { label: "offline", tone: "void", blink: false },
  loading: { label: "tuning in", tone: "steel", blink: false },
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
    <div
      style={{
        position: "relative",
        width: ART,
        height: ART,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        background: "var(--void)",
        border: "var(--border-1) solid var(--steel-400)",
        boxShadow: "var(--inset-well)",
      }}
    >
      {track?.albumArt ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={track.albumArt}
            alt={track.album ? `${track.album} album cover` : ""}
            width={ART - 8}
            height={ART - 8}
            data-spin={spinning ? "" : undefined}
            style={{
              width: ART - 8,
              height: ART - 8,
              borderRadius: "50%",
              objectFit: "cover",
              animation: spinning ? "jk-spin var(--dur-spin) linear infinite" : "none",
              filter: spinning ? "none" : "grayscale(1) brightness(.65)",
            }}
          />
          {/* Record label. Sits outside the spinning element so it stays crisp. */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "var(--void)",
              border: "var(--border-1) solid var(--steel-400)",
            }}
          />
        </>
      ) : (
        <Icon name="disc" size={30} style={{ opacity: 0.45 }} />
      )}
    </div>
  );
}

export function NowPlaying() {
  const [data, setData] = React.useState<NowPlayingPayload | null>(null);
  /** Milliseconds since the payload landed. Drives the progress bar; see below. */
  const [elapsed, setElapsed] = React.useState(0);

  // One fetch on mount — deliberately no polling.
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
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
        <Art track={track} spinning={playing} />

        {/* minWidth:0 lets the ellipsis actually kick in inside a flex row. */}
        <div style={{ display: "grid", gap: "var(--space-2)", minWidth: 0, flex: 1 }}>
          {/* justifySelf keeps the badge hugging its text — as a grid item it
              would otherwise stretch across the whole column. */}
          <Badge tone={badge.tone} blink={badge.blink} style={{ justifySelf: "start" }}>
            {badge.label}
          </Badge>

          {track ? (
            <a
              href={track.url}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none", color: "inherit", display: "grid", gap: "var(--space-1)", minWidth: 0 }}
            >
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-strong)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {track.title}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {track.artist}
              </span>
            </a>
          ) : (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {status === "loading" ? "reading the turntable…" : "nothing on the decks"}
            </span>
          )}

          {playing && track && track.durationMs > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <div
                style={{
                  flex: 1,
                  height: 4,
                  minWidth: 0,
                  background: "var(--void)",
                  boxShadow: "var(--inset-well)",
                  border: "var(--border-1) solid var(--steel-400)",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (progress / track.durationMs) * 100)}%`,
                    height: "100%",
                    background: "var(--xgreen)",
                    boxShadow: "var(--glow-green)",
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-pixel-micro)",
                  fontSize: "var(--text-2xs)",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {clock(progress)} / {clock(track.durationMs)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {data?.recent.length ? (
        <div style={{ display: "grid", gap: "var(--space-3)", borderTop: "var(--border-1) solid var(--steel-400)", paddingTop: "var(--space-4)" }}>
          <span
            style={{
              fontFamily: "var(--font-pixel-micro)",
              fontSize: "var(--text-2xs)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-caps)",
              color: "var(--text-muted)",
            }}
          >
            recently
          </span>
          {data.recent.map((t, i) => (
            <a
              key={`${t.url}-${i}`}
              href={t.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                gap: "var(--space-3)",
                alignItems: "center",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "inherit",
                textDecoration: "none",
                minWidth: 0,
              }}
            >
              <Icon name="disc" />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.artist} · {t.title}
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
