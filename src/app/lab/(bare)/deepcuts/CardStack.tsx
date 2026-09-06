"use client";

import { useState } from "react";
import { motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import type { PanInfo } from "motion/react";
import { DEEPCUTS_TEASER } from "@/data/lab";
import type { PackCard } from "@/models";
import { CardFace } from "./CardFace";
import styles from "./deepcuts.module.scss";

export type CardStackProps = {
  cards: PackCard[];
  /** The pack these came out of. The wrapper is gone by now, so the deck has to say. */
  playlistName: string;
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
    <CardFace
      title={card.track.title}
      artist={card.track.artist}
      album_art={card.track.album_art}
      plays={card.track.plays}
      tier={card.tier}
      shiny={card.shiny}
    />
  );

  if (still) return <li className={styles.pullFlat}>{face}</li>;

  return (
    <motion.li
      className={styles.pullSlot}
      style={{ x, y, rotateX, rotateY, zIndex: offset }}
      /* POPPING OUT, ONE AFTER THE OTHER. They arrive from nothing rather than fading in,
         because what just happened is five cards coming out of a torn wrapper. The
         stagger runs up the pile - offset 0 is the card at the back - so the last card
         dealt, which sits in front, is the last thing to land. */
      initial={{ scale: 0.35, opacity: 0, y: 30 }}
      animate={{ rotate: LEAN[offset % LEAN.length], y: offset * -4, scale: 1, opacity: 1 }}
      transition={{ ...SPRING, delay: offset * 0.07 }}
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

export const CardStack = ({ cards, playlistName }: CardStackProps) => {
  const still = useReducedMotion();

  /* The order is state because throwing a card changes it. Reversed off the deal so the
     last card dealt lands at index 0, and the front of the pile is the one seen first. */
  const [order, setOrder] = useState(() => [...cards].reverse());

  const sendToBack = (slot: number) =>
    setOrder((current) => {
      const next = current.filter((card) => card.slot !== slot);
      const thrown = current.find((card) => card.slot === slot);
      // To the BACK, so the pile never empties and a reader can go round again.
      return thrown ? [...next, thrown] : current;
    });

  /* THE CARD THE READER IS ACTUALLY LOOKING AT, which is the FIRST of the array and not
     the last: each card's z-index is its offset, offset counts down the array, so index
     0 carries the highest one and sits in front. Reading from the other end pointed this
     link at the card at the very back of the pile, which is the one nobody can see. It
     moves every time a card is thrown, and that is what makes a single link under a pile
     worth having rather than a static one. */
  const top = order[0];

  return (
    <div className={styles.pulled}>
      <p className={styles.pulledLabel}>
        {DEEPCUTS_TEASER.pulled_label} {DEEPCUTS_TEASER.pulled_from} {playlistName}
      </p>

      <ul className={still ? styles.pullList : styles.deck} data-count={order.length}>
        {order.map((card, index) => (
          <Card
            key={card.slot}
            card={card}
            /* Counts down the array, and it is the z-index too: index 0 gets the
               highest offset, so the first card drawn here is the one in front. */
            offset={order.length - 1 - index}
            onThrow={() => sendToBack(card.slot)}
            still={Boolean(still)}
          />
        ))}
      </ul>

      {/* FOLLOWS THE TOP CARD. Shuffling the deck changes which song this opens, which is
          the only sensible reading of a single link under a pile: it belongs to the card
          you can see. Keyed on the uri so the label animates when the card beneath it
          changes rather than swapping text in place. */}
      {top?.track.url ? (
        <a
          key={top.track.uri}
          className={styles.pullOpen}
          href={top.track.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {DEEPCUTS_TEASER.card_open_spotify}
        </a>
      ) : null}

      <p className={styles.pulledNote}>{DEEPCUTS_TEASER.pulled_note}</p>
    </div>
  );
};
