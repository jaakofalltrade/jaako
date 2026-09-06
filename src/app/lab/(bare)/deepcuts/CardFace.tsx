import { DEEPCUT_TIER } from "@/constants";
import { DEEPCUTS_TEASER } from "@/data/lab";
import type { DeepcutTier } from "@/models";
import { compactCount } from "@/utils/format";
import styles from "./deepcuts.module.scss";

export type CardFaceProps = {
  title: string;
  artist: string;
  /** The record's cover, host-checked upstream, or null for a track with no artwork. */
  album_art: string | null;
  /** Scrobbles at the moment the card was dealt. Null when the count was never known. */
  plays: number | null;
  tier: DeepcutTier;
  shiny: boolean;
};

/**
 * What a card looks like. One face, no behaviour.
 *
 * EXTRACTED WHEN THE COLLECTION TAB ARRIVED, and the reason is worth stating because the
 * duplication would have been easy to live with. Two places render a card: the deck a
 * pack deals into, where a face is draggable and stacked, and the binder, where the same
 * face sits still in a grid. They differ entirely in behaviour and not at all in
 * appearance - so the appearance is here and the behaviour is in the two callers.
 *
 * Copying it instead would have meant the shiny treatment, the rung mark and the play
 * count each existing twice, and the failure mode of that is not a crash: it is a card
 * that looks subtly different depending on which tab you are looking at it in, which is
 * the one thing a card must never do.
 *
 * FLAT PROPS RATHER THAN A PackCard, because the two callers hold different shapes. A
 * dealt card hangs off a live ScoredTrack; a collected one is a row read back out of
 * Neon with the numbers frozen at deal time. Taking six fields lets both pass what they
 * have without either converting into the other's shape.
 *
 * A server component: it renders its arguments. The deck wraps it in something that
 * moves; nothing here does.
 */
export const CardFace = ({ title, artist, album_art, plays, tier, shiny }: CardFaceProps) => (
  <span className={`${styles.pull} ${shiny ? styles.shiny : ""}`} data-tier={tier}>
    {album_art ? (
      /* The album cover is the card. Host-checked where it was read - the Spotify
         mappers for a dealt card, and before it was stored for a collected one - and the
         page's CSP is the second lock. */
      /* eslint-disable-next-line @next/next/no-img-element */
      <img className={styles.pullArt} src={album_art} alt="" width={320} height={320} />
    ) : (
      <span className={styles.pullArtEmpty} aria-hidden="true" />
    )}

    {/* The rung, as stars and a word, in the corner a card carries its set mark.
        aria-hidden on the stars because the word beside them says the same thing, and a
        screen reader counting six identical characters is noise rather than information. */}
    <span className={styles.pullMark}>
      <span className={styles.pullStars} aria-hidden="true">
        {"★".repeat(DEEPCUT_TIER[tier].stars)}
      </span>
      <span className={styles.pullTier}>{DEEPCUT_TIER[tier].label}</span>
    </span>

    {shiny ? <span className={styles.pullShiny}>{DEEPCUTS_TEASER.shiny_badge}</span> : null}

    <span className={styles.pullBody}>
      <span className={styles.pullTitle}>{title}</span>
      <span className={styles.pullArtist}>{artist}</span>
      {plays !== null ? (
        <span className={styles.pullPlays}>
          {compactCount(plays)} {DEEPCUTS_TEASER.dialog_plays}
        </span>
      ) : null}
    </span>
  </span>
);
