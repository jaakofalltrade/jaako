import { SUGGEST_TEASER } from "@/data/lab";
import type { PlaylistSummary } from "@/models";
import { getHoursMinutes } from "@/oras/milliseconds";
import { Annotation } from "@/design-system/core/Annotation";
import { AnnotationTone } from "@/models";
import styles from "./suggest.module.scss";

export type PlaylistCardProps = {
  /** Null when Spotify is unreachable or the playlist is not configured. */
  playlist: PlaylistSummary | null;
};

/**
 * The playlist, at the top of /lab/suggest.
 *
 * The one thing on this page that is real while the rest of it is a teaser, and that
 * is the point of it being here first: the reader can see what they would be adding to
 * and go and listen to it, before a single control on the page does anything.
 *
 * A server component. Everything it renders was fetched on the server and passed down,
 * so the browser never learns the playlist id and never talks to Spotify.
 *
 * THE WHOLE CARD IS THE LINK. A cover that opens Spotify beside a title that does not
 * is two targets for one intention; the anchor wraps the lot, and the only other
 * interactive thing on this page is the search field far below it.
 */
export const PlaylistCard = ({ playlist }: PlaylistCardProps) => {
  /* Reads degrade. A playlist that cannot be reached leaves a quiet line rather than
     an error, because the rest of the page still explains itself perfectly well and
     this block is not what the visitor came for. Writes are what refuse out loud. */
  if (!playlist) {
    return (
      <div className={styles.playlistOffline}>
        <Annotation tone={AnnotationTone.Info}>{SUGGEST_TEASER.playlist_offline}</Annotation>
      </div>
    );
  }

  const tracks = `${playlist.track_count} ${playlist.track_count === 1 ? "song" : "songs"}`;

  return (
    <a
      className={styles.playlist}
      href={playlist.url}
      /* Leaving the site, and to an app rather than a page. noreferrer rides along with
         noopener because the target is a third party and there is nothing in our
         referrer worth handing over. */
      target="_blank"
      rel="noopener noreferrer"
    >
      {playlist.cover ? (
        /* A plain img, as the now-playing dock uses for album art. next/image would
           want remotePatterns for two Spotify CDNs, one of which rotates its subdomain,
           and would buy nothing: this is one small square with a known display size.
           The host was already checked in the mapper; the CSP is the second lock. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className={styles.playlistCover} src={playlist.cover} alt="" width={112} height={112} />
      ) : (
        // Never an empty box. A cover that failed its host check leaves a square of the
        // page's own quiet surface rather than a broken image icon.
        <span className={styles.playlistCoverEmpty} aria-hidden="true" />
      )}

      <span className={styles.playlistBody}>
        <Annotation tone={AnnotationTone.Info}>{SUGGEST_TEASER.playlist_label}</Annotation>

        <span className={styles.playlistName}>{playlist.name}</span>

        {playlist.description ? (
          <span className={styles.playlistDescription}>{playlist.description}</span>
        ) : null}

        {/* Mono and small, like every other readout on the site, so it reads as a
            specification rather than as copy. The separator is decorative and hidden,
            so a screen reader hears "12 songs 41 min" rather than a row of dots. */}
        <span className={styles.playlistSpec}>
          {tracks}
          <span aria-hidden="true"> · </span>
          {getHoursMinutes.fromMilliseconds({ milliseconds: playlist.runtime_ms })}
          <span aria-hidden="true"> · </span>
          <span className={styles.playlistOpen}>open in spotify →</span>
        </span>
      </span>
    </a>
  );
};
