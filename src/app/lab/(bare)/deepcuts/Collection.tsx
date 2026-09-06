"use client";

import { useEffect, useState } from "react";
import { remoteService } from "@/client/remoteService";
import { DEEPCUT_TIER } from "@/constants";
import { DEEPCUTS_TEASER } from "@/data/lab";
import type { CollectedCard } from "@/models";
import { CardFace } from "./CardFace";
import styles from "./deepcuts.module.scss";

export type CollectionProps = {
  /**
   * Whether this tab is the one being looked at.
   *
   * THE REFETCH TRIGGER, AND THE REASON IT IS A PROP RATHER THAN A CONTEXT. A pack is
   * opened two tabs away, inside a dialog, several components down - so this has no way
   * to hear about a rip, and threading a signal up from PackDialog through PackShelf and
   * Shelf to here would be four files carrying a message for one of them.
   *
   * Coming back to the tab is the moment a reader wants it current, and it is a moment
   * this already knows about because the tab strip keeps every panel mounted. So the
   * read happens on arrival. It costs one query per visit to the tab and is never stale
   * when anybody is looking at it.
   */
  active: boolean;
};

/**
 * The binder: every card this browser has pulled, rarest first.
 *
 * NOT THE CARDS TAB, which is next to it and answers a different question. That one is
 * the SET - one face per rung, what a deep cut looks like, printed the way the back of a
 * booster box is. This is what you actually have, and until the rip existed it could not
 * be built at all.
 *
 * WHOSE CARDS: THIS BROWSER'S. The route reads the visitor cookie and nothing else, so
 * "mine" means the machine and the browser profile rather than a person. Clearing cookies
 * loses the binder and a shared browser shares it, which is the same bargain the
 * suggestion box makes and the right one for a page about opening card packs - the
 * alternative is asking somebody to make an account first.
 *
 * A CLIENT COMPONENT, WHERE EVERY OTHER TAB IS A SERVER ONE. The others render constants.
 * This one reads a cookie-scoped query that must never be cached across visitors and must
 * be re-read when the reader comes back from opening a pack, and a fetch on arrival is
 * the smallest thing that does both.
 *
 * AN EMPTY BINDER IS THE COMMON CASE, not an error. It is what every first-time visitor
 * sees, so it is written as an invitation rather than an apology - and it is kept apart
 * from a failed read, which says so instead of pretending the binder is empty.
 */
export const Collection = ({ active }: CollectionProps) => {
  const [cards, setCards] = useState<CollectedCard[] | null>(null);
  /* Its own state rather than a sentinel inside `cards`, because "read and empty" and
     "could not read" are different things to a reader: one is an invitation to open a
     pack, the other is not their fault and not their problem to fix. */
  const [failed, setFailed] = useState("");

  useEffect(() => {
    if (!active) return;

    const controller = new AbortController();

    void remoteService.collection({ signal: controller.signal }).then((answer) => {
      if (controller.signal.aborted) return;

      if (answer.ok) {
        setCards(answer.data);
        setFailed("");
        return;
      }

      // An empty sentence is an abort this component asked for. Nothing to say.
      if (answer.error) setFailed(answer.error);
    });

    return () => controller.abort();
  }, [active]);

  if (failed) return <p className={styles.ladderNote}>{failed}</p>;

  /* Null is "not read yet" and [] is "read, and empty". Collapsing them would flash the
     empty-binder invitation at somebody who has two hundred cards, every time they open
     the tab. */
  if (cards === null) {
    return <p className={styles.ladderNote}>{DEEPCUTS_TEASER.collection_loading}</p>;
  }

  if (cards.length === 0) {
    return <p className={styles.ladderNote}>{DEEPCUTS_TEASER.collection_empty}</p>;
  }

  /* Counted here rather than in SQL. One extra query to have the database count rows this
     request already holds would be a round trip for a number that is `cards.length`. */
  const rarest = DEEPCUT_TIER[cards[0].tier].label;

  return (
    <>
      <p className={styles.ladderNote}>
        {cards.length} {DEEPCUTS_TEASER.collection_count} {rarest}
      </p>

      {/* A GRID RATHER THAN THE DECK. The same faces, and none of the stacking: a pile you
          throw through is right for five cards you have just been dealt and wrong for two
          hundred you are looking for one of. */}
      <ul className={styles.binder}>
        {cards.map((card) => (
          <li key={card.id} className={styles.binderSlot}>
            {/* The card links out when we have a URL for it. Rows written before the
                column existed have none, and those render as a plain face rather than as
                a dead link. */}
            {card.url ? (
              <a
                className={styles.binderLink}
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <CardFace
                  title={card.title}
                  artist={card.artist}
                  album_art={card.album_art}
                  plays={card.plays}
                  tier={card.tier}
                  shiny={card.shiny}
                />
              </a>
            ) : (
              <CardFace
                title={card.title}
                artist={card.artist}
                album_art={card.album_art}
                plays={card.plays}
                tier={card.tier}
                shiny={card.shiny}
              />
            )}
          </li>
        ))}
      </ul>

      <p className={styles.source}>{DEEPCUTS_TEASER.collection_note}</p>
    </>
  );
};
