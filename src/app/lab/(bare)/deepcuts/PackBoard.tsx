"use client";

import React from "react";
import type { CSSProperties } from "react";
import { REVEAL_STAGGER_MS } from "@/constants";
import { DEEPCUTS_COPY, getSamplePack } from "@/data/deepcuts";
import { PackState } from "@/models";
import type { DeepcutPack } from "@/models";
import { cx } from "@/utils/cx";
import { Card } from "./Card";
import styles from "./deepcuts.module.scss";

export type PackBoardProps = {
  /** Dealt on the server, so the fan is in the HTML before any script runs. */
  initialPack: DeepcutPack;
};

/**
 * The interactive half of /lab/deepcuts: one wrapper, one fan, one button.
 *
 * A client island under a server-rendered page, the same arrangement /lab/suggest uses.
 * The fan is server-rendered face down and stays readable with JavaScript off — the
 * cards are all in the HTML, they simply never turn. What is lost without script is the
 * rip, which is the entertainment rather than the content.
 *
 * THE STATE IS ONE ENUM AND NOTHING ELSE. Every other thing the page does when a pack
 * opens — the wrapper tearing away, five cards spreading, each turning over in its own
 * time — is a CSS transition keyed off `data-state` and `data-revealed`. The temptation
 * is a timeline in React that sets a flag per card per beat, and it buys nothing except
 * two descriptions of the same animation that have to be kept agreeing with each other.
 *
 * Dealing a second pack is a new `id`, which changes the key on the fan and remounts
 * every card so the flip plays again. The cards inside are the same fixture until a
 * real dealer exists; the id is what makes the gesture feel like it did something.
 */
export const PackBoard = ({ initialPack }: PackBoardProps) => {
  const [pack, setPack] = React.useState(initialPack);
  const [state, setState] = React.useState(PackState.Sealed);

  const rip = () => setState(PackState.Open);

  /*
   * A fresh pack goes back to sealed, rather than dealing straight into a spread.
   * Re-ripping is the part worth repeating, and skipping to five face-up cards would
   * make the second pack the only one that never gets opened.
   */
  const again = () => {
    setPack(getSamplePack());
    setState(PackState.Sealed);
  };

  const open = state === PackState.Open;

  return (
    <div
      className={styles.board}
      data-state={state}
      /* The beat between one card turning and the next, handed to the stylesheet
         rather than written into it twice. The stagger is a rule about the reveal, and
         the reveal is described in one place; see REVEAL_STAGGER_MS. */
      style={{ "--dc-stagger": `${REVEAL_STAGGER_MS}ms` } as CSSProperties}
    >
      <div className={styles.table}>
        {/* Keyed on the pack, so every card remounts and replays its turn. */}
        <ul key={pack.id} className={styles.fan} aria-label={DEEPCUTS_COPY.fan_label}>
          {pack.cards.map((card, position) => (
            <Card key={card.id} card={card} position={position} revealed={open} />
          ))}
        </ul>

        {/* The wrapper stays mounted and is animated out of the way by `data-state`,
            rather than being unmounted on open. Unmounting it is one line shorter and
            there is no tear: the packet would simply stop existing on the frame the
            button is pressed, which is the single moment on this page worth animating.

            aria-hidden throughout. The words printed on a foil packet are packaging,
            and the button below says the same thing in a form that can be pressed. */}
        <div className={styles.pack} aria-hidden="true">
          <span className={styles.strip}>
            <span className={styles.stripLabel}>{DEEPCUTS_COPY.rip_label}</span>
            <span className={styles.stripNote}>{DEEPCUTS_COPY.rip_note}</span>
          </span>

          <span className={styles.packLabel}>{DEEPCUTS_COPY.pack_label}</span>

          <span className={styles.packMeta}>
            <span>{DEEPCUTS_COPY.pack_series}</span>
            <span>{DEEPCUTS_COPY.pack_count}</span>
          </span>
        </div>
      </div>

      {/* One button in one place, changing what it says. Two buttons swapping in and
          out would move focus off the control the visitor just pressed. */}
      <button
        type="button"
        className={cx(styles.action, open && styles.actionQuiet)}
        onClick={open ? again : rip}
      >
        {open ? DEEPCUTS_COPY.reset_action : DEEPCUTS_COPY.rip_action}
      </button>
    </div>
  );
};
