"use client";

import React, { type CSSProperties } from "react";
import { spotifyApi } from "@/api/spotifyApi";
import { LOADING_BADGE, PLAYBACK_BADGE } from "@/constants/spotify";
import { IconName, Spotify } from "@/models";
import { clock } from "@/utils/format";
import { Badge } from "@/design-system/core/Badge";
import { Icon } from "@/design-system/Icon";

/** Matches .jk-now-playing__cover in src/styles/widgets/_now-playing.scss. */
const ART_INNER = 68;

/**
 * Album cover as a record: circular, spinning while audio is actually playing,
 * desaturated and still otherwise. Falls back to the disc icon when the track has
 * no artwork, or before data lands.
 */
const Art = ({ track, spinning }: { track: Spotify.Track | null; spinning: boolean }) => (
  <div className="jk-now-playing__art">
    {track?.album_art ? (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={track.album_art}
          alt={track.album ? `${track.album} album cover` : ""}
          width={ART_INNER}
          height={ART_INNER}
          data-spin={spinning ? "" : undefined}
          className="jk-now-playing__cover"
        />
        <span aria-hidden="true" className="jk-now-playing__spindle" />
      </>
    ) : (
      <Icon name={IconName.Disc} size={30} className="jk-now-playing__disc" />
    )}
  </div>
);

export const NowPlaying = () => {
  const [response, setResponse] = React.useState<Spotify.NowPlayingResponse | null>(null);
  /** Milliseconds since the response landed. Drives the progress bar; see below. */
  const [elapsed, setElapsed] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);

  // One call on mount — deliberately no polling; the refresh button covers the rest.
  React.useEffect(() => {
    const controller = new AbortController();

    spotifyApi.nowPlaying({ signal: controller.signal }).then((next) => {
      if (controller.signal.aborted) return;
      setResponse(next);
    });

    return () => controller.abort();
  }, []);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);

    try {
      setResponse(await spotifyApi.nowPlaying({}));
      setElapsed(0);
    } finally {
      setRefreshing(false);
    }
  };

  // Advance the progress bar locally so it isn't frozen at the load-time value.
  // Costs no network. Only the interval writes state — the position itself is
  // derived below, which keeps this effect free of a synchronous setState.
  React.useEffect(() => {
    if (response?.status !== Spotify.PlaybackStatus.Playing || !response.track) return;

    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [response]);

  const badge = response ? PLAYBACK_BADGE[response.status] : LOADING_BADGE;
  const track = response?.track ?? null;
  const playing = response?.status === Spotify.PlaybackStatus.Playing;
  // Extrapolated from the load-time position; capped so it stops at the end of the
  // track instead of running past it.
  const progress = track ? Math.min(track.progress_ms + elapsed, track.duration_ms) : 0;

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
        <Icon name={IconName.RefreshCw} size={12} spin={refreshing} />
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
              {response ? "nothing on the decks" : "reading the turntable…"}
            </span>
          )}

          {playing && track && track.duration_ms > 0 ? (
            <div className="jk-now-playing__progress">
              <div className="jk-now-playing__bar">
                <div
                  className="jk-now-playing__bar-fill"
                  style={
                    {
                      "--np-progress": `${Math.min(100, (progress / track.duration_ms) * 100)}%`,
                    } as CSSProperties
                  }
                />
              </div>
              <span className="jk-now-playing__clock">
                {clock(progress)} / {clock(track.duration_ms)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {response?.recent.length ? (
        <div className="jk-now-playing__recent">
          <span className="jk-now-playing__recent-label">recently</span>
          {response.recent.map((entry, index) => (
            <a
              key={`${entry.url}-${index}`}
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              className="jk-now-playing__recent-item"
            >
              <Icon name={IconName.Disc} />
              <span className="jk-now-playing__recent-name">
                {entry.artist} · {entry.title}
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
};
