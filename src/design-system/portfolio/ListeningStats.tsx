"use client";

import React from "react";
import { spotifyTopApi } from "@/api/spotifyTopApi";
import { Spotify } from "@/models";
import { Annotation } from "../core/Annotation";
import { DefinitionList } from "../core/DefinitionList";

/**
 * The instrument strip's fourth cell: what has actually been on for the last month.
 *
 * Deliberately not "minutes listened" — the Spotify Web API has no endpoint for
 * cumulative listening time, and recently-played caps at 50 items so it cannot be
 * derived. Top artist, track and genre are the three real facts available.
 *
 * Needs the user-top-read scope. Until the refresh token is rotated to include it,
 * Spotify answers 403, the service returns the unavailable shape, and this renders a
 * quiet placeholder rather than breaking the strip.
 */
export const ListeningStats = () => {
  const [stats, setStats] = React.useState<Spotify.TopItemsResponse | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    spotifyTopApi.topItems({ signal: controller.signal }).then((next) => {
      if (controller.signal.aborted) return;
      setStats(next);
    });

    return () => controller.abort();
  }, []);

  if (!stats?.available) {
    return (
      // Informational, not decorative: this is the only thing telling a reader why
      // the cell is empty, so it stays in the accessibility tree and clears AA.
      <Annotation className="jk-stats__idle">
        {stats ? "no data" : "reading"}
      </Annotation>
    );
  }

  return (
    <DefinitionList
      className="jk-stats"
      items={[
        ...(stats.artist ? [{ term: "top artist", value: stats.artist.name }] : []),
        ...(stats.track ? [{ term: "top track", value: stats.track.title }] : []),
        ...(stats.genre ? [{ term: "top genre", value: stats.genre }] : []),
      ]}
    />
  );
};
