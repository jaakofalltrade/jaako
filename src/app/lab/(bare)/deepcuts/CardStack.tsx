"use client";

import { useState } from "react";
import { motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import type { PanInfo } from "motion/react";
import { DEEPCUT_TIER } from "@/constants";
import { DEEPCUTS_TEASER } from "@/data/lab";
import type { PackCard } from "@/models";
import { compactCount } from "@/utils/format";
import styles from "./deepcuts.module.scss";

export type CardStackProps = {
  cards: PackCard[];
};

/**
 * The five cards a pack dealt, as a deck you can throw off the top.
 *
 * ADAPTED FROM react-bits' Stack (reactbits.dev/components/stack). The mechanic is
 * theirs: a pile of cards, each draggable, and a drag past a threshold sends the top one
 * to the back. So are the spring constants and the fan of rotations.
 *
 * WHAT WAS CHANGED, AND WHY EACH:
 *
 *   the cards       Theirs takes an array of ReactNodes and falls back to four Unsplash
 *                   photographs. These are our own cards - album art, title, rung - so
 *                   the component takes PackCards and renders them, rather than taking
 *                   anything and rendering it.
 *   the drag axes   Theirs rotates on both axes from the drag offset, which reads as a
 *                   card being wobbled. A trading card is thrown off a pile, so this
 *                   keeps the tilt but drives it mostly off the horizontal.
 *   mobile          Theirs measures window.innerWidth in an effect to decide whether to
 *                   disable dragging. Dragging works fine with a finger; what does not
 *                   is the hover, and that needs no measurement.
 *   autoplay        Dropped. A pack that shuffles itself while you are reading it is
 *                   taking the cards away.
 *
 * REDUCED MOTION GETS A LIST, NOT A PILE. A stack you have to drag is motion as the only
 * way through the content, which is exactly what that setting is asking to be spared, so
 * the cards lay out flat and all five are readable at once.
 */

/** react-bits' own spring for the pile. */
const SPRING = { type: "spring" as const, stiffness: 260, damping: 20 };

/** How far a card has to be thrown before it goes to the back. Theirs. */
const SENSITIVITY = 140;

/** The fan. Fixed per position rather than random, so a pack looks the same on a reload. */
const LEAN = [-6, 4, -3, 6, -2];

const Card = ({
  card,
  offset,
  onThrow,
  still,
}: {
  card: PackCard;
  offset: number;
  onThrow: () => void;
  still: boolean;
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  /* Mostly horizontal: a card is thrown off a pile sideways. The vertical range is wider
     so the same wrist movement produces less tilt from it. */
  const rotateY = useTransform(x, [-160, 160], [-22, 22]);
  const rotateX = useTransform(y, [-240, 240], [14, -14]);

  const face = (
    <span className={`${styles.pull} ${card.shiny ? styles.shiny : ""}`} data-tier={card.tier}>
      {card.track.album_art ? (
        /* The album cover is the card. Host-checked in the mapper; the CSP is the second
           lock. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className={styles.pullArt} src={card.track.album_art} alt="" width={320} height={320} />
      ) : (
        <span className={styles.pullArtEmpty} aria-hidden="true" />
      )}

      {/* The rung, as a symbol and a word, in the corner a card carries its set mark. */}
      <span className={styles.pullMark}>
        <span className={styles.pullSymbol} aria-hidden="true">
          {DEEPCUT_TIER[card.tier].symbol}
        </span>
        <span className={styles.pullTier}>{DEEPCUT_TIER[card.tier].label}</span>
      </span>

      {card.shiny ? <span className={styles.pullShiny}>{DEEPCUTS_TEASER.shiny_badge}</span> : null}

      <span className={styles.pullBody}>
        <span className={styles.pullTitle}>{card.track.title}</span>
        <span className={styles.pullArtist}>{card.track.artist}</span>
        {card.track.plays !== null ? (
          <span className={styles.pullPlays}>
            {compactCount(card.track.plays)} {DEEPCUTS_TEASER.dialog_plays}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (still) return <li className={styles.pullFlat}>{face}</li>;

  return (
    <motion.li
      className={styles.pullSlot}
      style={{ x, y, rotateX, rotateY, zIndex: offset }}
      animate={{ rotate: LEAN[offset % LEAN.length], y: offset * -4 }}
      transition={SPRING}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      whileTap={{ cursor: "grabbing" }}
      onDragEnd={(_event: unknown, info: PanInfo) => {
        if (Math.abs(info.offset.x) > SENSITIVITY || Math.abs(info.offset.y) > SENSITIVITY) {
          onThrow();
        }
        x.set(0);
        y.set(0);
      }}
    >
      {face}
    </motion.li>
  );
};

export const CardStack = ({ cards }: CardStackProps) => {
  const still = useReducedMotion();

  /* The order is state because throwing a card changes it. Seeded from the deal, so the
     hit slot starts on top - it is the last card dealt and the one worth seeing first. */
  const [order, setOrder] = useState(() => [...cards].reverse());

  const sendToBack = (slot: number) =>
    setOrder((current) => {
      const next = current.filter((card) => card.slot !== slot);
      const thrown = current.find((card) => card.slot === slot);
      // To the BACK, so the pile never empties and a reader can go round again.
      return thrown ? [...next, thrown] : current;
    });

  return (
    <div className={styles.pulled}>
      <p className={styles.pulledLabel}>{DEEPCUTS_TEASER.pulled_label}</p>

      <ul className={still ? styles.pullList : styles.deck} data-count={order.length}>
        {order.map((card, index) => (
          <Card
            key={card.slot}
            card={card}
            /* Later in the array is nearer the top of the pile, so the last one drawn
               here is the first one seen. */
            offset={order.length - 1 - index}
            onThrow={() => sendToBack(card.slot)}
            still={Boolean(still)}
          />
        ))}
      </ul>

      <p className={styles.pulledNote}>{DEEPCUTS_TEASER.pulled_note}</p>
    </div>
  );
};
