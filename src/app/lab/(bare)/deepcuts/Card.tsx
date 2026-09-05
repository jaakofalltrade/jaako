import type { CSSProperties } from "react";
import { DEEPCUT_TIER } from "@/constants";
import { DEEPCUTS_COPY } from "@/data/deepcuts";
import type { DeepcutCard } from "@/models";
import { getPlayCount } from "@/utils/format";
import styles from "./deepcuts.module.scss";

export type CardProps = {
  card: DeepcutCard;
  /** Where in the fan it sits. Drives the spread and the reveal's turn to go. */
  position: number;
  /** False while the pack is still shut, which is what keeps the face hidden. */
  revealed: boolean;
};

/**
 * One card, both sides of it.
 *
 * The face and the back are always both in the DOM and the card is rotated between
 * them, rather than swapping one for the other when it turns. Swapping would mean the
 * face mounts mid-flip, which is when the browser is least able to paint it, and it
 * would put the track's name into the document only at the moment it appears — so a
 * screen reader would announce the whole pack as five identical monograms until
 * something happened to it.
 *
 * THE TIER IS NEVER CARRIED BY COLOUR ALONE. Every card prints its rung as a word,
 * beside the foil that says the same thing. The foils are the point of the design and
 * they are decoration on top of a label, not instead of one.
 *
 * `position` is not the tier and must not be read as one. The fan is ordered worst to
 * best, so the two happen to agree in the sample pack and will not agree the moment a
 * real dealer shuffles what it hands over.
 */
export const Card = ({ card, position, revealed }: CardProps) => {
  const rung = DEEPCUT_TIER[card.tier];

  return (
    <li
      className={styles.card}
      data-position={position}
      data-tier={card.tier}
      data-revealed={revealed}
      /* The stagger is an animation-delay read off this property, not a timer in
         React. Nothing here waits its turn; every card is mounted from the start and
         the stylesheet decides when each one is allowed to move. */
      style={{ "--dc-turn": position } as CSSProperties}
    >
      <div className={styles.cardInner}>
        <span className={styles.cardBack} aria-hidden="true">
          <span className={styles.cardBackMark}>{DEEPCUTS_COPY.card_back}</span>
        </span>

        <span className={styles.cardFace}>
          {/* The art slot draws itself until a playlist read supplies a URL. It keeps
              its aspect ratio either way, so nothing below it moves when the real
              image arrives. */}
          <span className={styles.cardArt} aria-hidden="true">
            {card.art_url === null ? null : (
              /* A plain img rather than next/image: the art host is already pinned by
                 the CSP to i.scdn.co, so the optimiser's remote-pattern config would
                 restate a constraint the headers enforce, and the card draws the slot
                 at a fixed aspect ratio either way. Revisit if these ever go retina. */
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.cardArtImage} src={card.art_url} alt="" />
            )}
          </span>

          <span className={styles.cardTier}>{rung.label}</span>

          <span className={styles.cardTitle}>{card.title}</span>
          <span className={styles.cardArtist}>{card.artist}</span>

          <span className={styles.cardPlays}>
            <span className={styles.cardPlaysValue}>{getPlayCount(card.plays)}</span>
            <span className={styles.cardPlaysLabel}>{DEEPCUTS_COPY.plays_label}</span>
          </span>
        </span>
      </div>
    </li>
  );
};
