"use client";

import { useState } from "react";
import { DEEPCUTS_TEASER } from "@/data/lab";
import { Stack } from "@/design-system/core/Stack";
import type { PackCard } from "@/models";
import { CardFace } from "./CardFace";
import styles from "./deepcuts.module.scss";

export type CardStackProps = {
  cards: PackCard[];
  /** The pack these came out of. The wrapper is gone by now, so the deck has to say. */
  playlistName: string;
};

/**
 * The five cards a pack dealt.
 *
 * THIN, AND DELIBERATELY SO. The pile itself - the drag, the fan, the order, the throw -
 * is Stack in the design system, because a throwable pile of anything is a real widget
 * and nothing about it is specific to music. What is left here is everything that IS
 * specific: the card faces, the rung colours they carry, the line naming the pack, and
 * the Spotify link that follows whichever card is in front.
 *
 * That split is the rule the design system follows everywhere. Stack ships no styling and
 * takes every class from this file, so a second app could use the same pile without
 * inheriting one lab page's cascade.
 *
 * THE LINK FOLLOWS THE FRONT CARD, which is what makes a single link under a pile make
 * sense at all: it belongs to the card you can see. Stack owns the order, so this tracks
 * it through onThrow rather than keeping a second copy of the reordering.
 */
export const CardStack = ({ cards, playlistName }: CardStackProps) => {
  /* Reversed off the deal so the last card dealt is at the front, which is the one worth
     seeing first. Kept in step with Stack's own order through onThrow. */
  const [front, setFront] = useState(() => [...cards].reverse().map((card) => card.slot));

  const top = cards.find((card) => card.slot === front[0]);

  const items = [...cards].reverse().map((card) => ({
    id: String(card.slot),
    node: (
      <CardFace
        title={card.track.title}
        artist={card.track.artist}
        album_art={card.track.album_art}
        plays={card.track.plays}
        tier={card.tier}
        shiny={card.shiny}
      />
    ),
  }));

  return (
    <div className={styles.pulled}>
      <p className={styles.pulledLabel}>
        {DEEPCUTS_TEASER.pulled_label} {DEEPCUTS_TEASER.pulled_from} {playlistName}
      </p>

      <Stack
        items={items}
        label={DEEPCUTS_TEASER.pulled_label}
        classNames={{
          list: styles.deck,
          slot: styles.pullSlot,
          stillList: styles.pullList,
          stillSlot: styles.pullFlat,
        }}
        onThrow={(id) =>
          /* Mirrors what Stack just did to its own order: the thrown card goes to the
             back, so the next one is in front and the link below follows it. */
          setFront((current) => [...current.filter((slot) => String(slot) !== id), Number(id)])
        }
      />

      {/* FOLLOWS THE FRONT CARD. Shuffling the deck changes which song this opens, which
          is the only sensible reading of a single link under a pile. Keyed on the uri so
          the label animates when the card beneath it changes rather than swapping text
          in place. */}
      {top?.track.url ? (
        <a
          key={top.track.uri}
          className={styles.pullOpen}
          href={top.track.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {DEEPCUTS_TEASER.card_open_before} {top.track.title} {DEEPCUTS_TEASER.card_open_after}
        </a>
      ) : null}

      <p className={styles.pulledNote}>{DEEPCUTS_TEASER.pulled_note}</p>
    </div>
  );
};
