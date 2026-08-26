"use client";

import React from "react";
import { spotifyTopApi } from "@/api/spotifyTopApi";
import { DecryptAlphabet, Spotify } from "@/models";
import { Annotation } from "../core/Annotation";
import { DecryptedText } from "../core/DecryptedText";
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
        {/* "reading" becomes "no data" when the fetch resolves, and DecryptedText
            restarts on a changed string — so the placeholder settles once on arrival
            and then once more as it is answered, which is the cell doing exactly what
            it says. */}
        <DecryptedText text={stats ? "no data" : "reading"} alphabet={DecryptAlphabet.Upper} />
      </Annotation>
    );
  }

  /* THIS IS THE CELL THE LATE-ARRIVAL RERUN WAS FOR. These three values are fetched, so
     they land a beat after the rest of the rail has already settled. Without the rerun
     they would pop in fully formed next to eight readouts that had visibly worked for
     theirs; with it, the cell acquires its signal when the signal actually arrives,
     which is the only honest order for it to happen in. */
  return (
    <DefinitionList
      className="jk-stats"
      items={[
        ...(stats.artist
          ? [
              {
                term: "top artist",
                value: (
                  <DecryptedText text={stats.artist.name} alphabet={DecryptAlphabet.Lower} />
                ),
              },
            ]
          : []),
        ...(stats.track
          ? [
              {
                term: "top track",
                value: (
                  <DecryptedText text={stats.track.title} alphabet={DecryptAlphabet.Lower} />
                ),
              },
            ]
          : []),
        ...(stats.genre
          ? [
              {
                term: "top genre",
                value: <DecryptedText text={stats.genre} alphabet={DecryptAlphabet.Lower} />,
              },
            ]
          : []),
      ]}
    />
  );
};
