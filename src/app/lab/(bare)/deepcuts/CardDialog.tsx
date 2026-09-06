"use client";

import { useEffect, useId, useRef } from "react";
import { DEEPCUT_TIER } from "@/constants";
import { DEEPCUTS_TEASER } from "@/data/lab";
import { TiltedCard } from "@/design-system/core/TiltedCard";
import type { CollectedCard } from "@/models";
import { CardFace } from "./CardFace";
import styles from "./deepcuts.module.scss";

export type CardDialogProps = {
  /** The card being looked at. Null when nothing is open. */
  card: CollectedCard | null;
  onClose: () => void;
};

/**
 * One card out of the binder, held up to the light.
 *
 * IT REPLACED A LINK, AND THAT IS THE WHOLE POINT. A card in the binder used to be an
 * anchor: clicking it left the site for Spotify. That is a strange thing for a card to do
 * - the first thing anybody wants from a card they pulled is to LOOK at it, and being
 * thrown out of the page to do that is the opposite. So a click brings the card forward
 * at four times the size, on the tilt, and the Spotify link is one of the things you can
 * then choose to do with it rather than the only thing a click can mean.
 *
 * SAME <dialog> MACHINERY AS THE PACK, for the same four reasons: the page behind goes
 * inert to pointer and screen reader, focus is trapped, Escape closes, and it renders in
 * the top layer where no stacking context can cover it. None of that is visible and all
 * of it is a pile of easy-to-get-wrong code otherwise.
 *
 * THE TILT IS THE DESIGN SYSTEM'S, not a second copy. TiltedCard takes children, so the
 * same card face the binder draws goes straight into it.
 */
export const CardDialog = ({ card, onClose }: CardDialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();


  /* showModal() and close() are imperative, so opening is an effect rather than an
     attribute. `open` as a prop would render it non-modally: no top layer, no focus
     trap, no backdrop. */
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (card && !dialog.open) dialog.showModal();
    if (!card && dialog.open) dialog.close();
  }, [card]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      /* Anything that is not the card itself is a way out. The dialog box is transparent
         and nearly the size of the screen, so a click landing on it or on the stage
         inside it is a click that missed the card. */
      onClick={(event) => {
        if (event.target === ref.current || event.target === event.currentTarget) {
          ref.current?.close();
        }
      }}
    >
      {card ? (
        <div
          className={styles.cardStage}
          onClick={(event) => {
            if (event.target === event.currentTarget) ref.current?.close();
          }}
        >

          {/* Comes forward rather than appearing, which is the same gesture a shelf pack
              makes when it is clicked. The pop is a CSS keyframe rather than a motion
              element: it is a one-shot entrance with no state behind it, and a keyframe is
              the smaller of the two ways to write that. See .cardShell. */}
          <div className={styles.cardShell}>
            <TiltedCard classNames={{ stage: styles.tiltStage, card: styles.cardHeld }}>
              <CardFace
                title={card.title}
                artist={card.artist}
                album_art={card.album_art}
                plays={card.plays}
                tier={card.tier}
                shiny={card.shiny}
              />
            </TiltedCard>
          </div>

          <p className={styles.cardHeldName} id={titleId}>
            {card.title}
            <span className={styles.cardHeldRung}>{DEEPCUT_TIER[card.tier].label}</span>
          </p>

          {/* Now a choice rather than what a click means. A card with no stored link -
              written before 003 added the column - simply does not offer one. */}
          {card.url ? (
            <a
              className={styles.pullOpen}
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {DEEPCUTS_TEASER.card_open_before} {card.title} {DEEPCUTS_TEASER.card_open_after}
            </a>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
};
