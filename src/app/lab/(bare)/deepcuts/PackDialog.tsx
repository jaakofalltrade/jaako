"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { fetchPack, ripPack } from "@/client/deepcutsApi";
import {
  DEEPCUT_TIER,
  RIP_FLASH_MS,
  RIP_FORWARD_MS,
  RIP_SEQUENCE_MS,
  RIP_TEAR_MS,
} from "@/constants";
import { compactCount } from "@/utils/format";
import { DEEPCUTS_TEASER } from "@/data/lab";
import type { DeepcutsPlaylist, PackCard, PackContents } from "@/models";
import { CardStack } from "./CardStack";
import { TiltedPack } from "./TiltedPack";
import styles from "./deepcuts.module.scss";

export type PackDialogProps = {
  /** The pack that was clicked. Null when nothing is open. */
  playlist: DeepcutsPlaylist | null;
  onClose: () => void;
};

/**
 * An opened pack: the wrapper itself, brought to the front over a blurred page.
 *
 * NOT A MODAL SLIDING IN. The pack comes forward: it starts small and set back, and
 * arrives at the front while the page behind it blurs away. `motion` drives it, which is
 * what makes the exit possible at all - React unmounts on close, so an animated close
 * needs something holding the element on screen while it leaves, and AnimatePresence is
 * exactly that.
 *
 * IT WAS BRIEFLY A SHARED-ELEMENT TRAVEL, with the same `layoutId` on the shelf's button
 * and on this, so the clicked pack flew from its square in the grid. That is the better
 * effect and it does not survive `aspect-ratio`: a shared layout animates by SCALING, and
 * with both packs mounted it settled holding a scale transform - the opened pack rendered
 * at the grid pack's size and lapped over the rip button. Popping forward is the same
 * gesture and it leaves the box alone.
 *
 * IT IS STILL A NATIVE <dialog> UNDERNEATH, deliberately rather than as a leftover.
 * showModal() gives four things that are each a pile of easy-to-get-wrong code
 * otherwise: the page behind goes inert to pointer and screen reader, focus is trapped,
 * Escape closes, and it renders in the top layer where no stacking context can cover it.
 * None of that is visible, and dropping it to avoid the word "modal" would trade real
 * accessibility for a label.
 *
 * WHAT DID GO IS THE MODAL'S LOOK. The dialog paints nothing now: no panel, no border,
 * no shadow, no scrollbar of its own. The pack and the list are the only things on
 * screen, over a blurred page.
 *
 * ONLY THE SONG LIST SCROLLS. The pack, the rip button and the notes are fixed and the
 * cards take whatever height is left. Scrolling the lot meant the pack you had just
 * opened slid off the top the moment you looked at what was inside it.
 */
export const PackDialog = ({ playlist, onClose }: PackDialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  /* Somebody who asked the browser for no motion gets the pack in place rather than
     thrown at them. Framer Motion reads the same media query; asking it here is what
     lets the whole animation be dropped rather than merely shortened. */
  const still = useReducedMotion();
  /* Stable across server and client render, and unique if this is ever used twice. The
     dialog needs an accessible name and its name is the playlist. */
  const titleId = useId();

  /* ONE PIECE OF STATE, STAMPED WITH THE PACK IT BELONGS TO. A slow answer for pack A
     can land after pack B has been opened, and clearing state beforehand does not
     prevent that - the id does. */
  const [result, setResult] = useState<{
    id: string;
    contents: PackContents | null;
    failed: boolean;
  } | null>(null);

  /* showModal() and close() are imperative, so opening is an effect rather than an
     attribute. `open` as a prop would render the dialog non-modally: no top layer, no
     focus trap, no backdrop. */
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (playlist && !dialog.open) dialog.showModal();
    if (!playlist && dialog.open) dialog.close();
  }, [playlist]);

  useEffect(() => {
    if (!playlist) return;

    const controller = new AbortController();
    const id = playlist.id;

    fetchPack({ playlist_id: id, signal: controller.signal })
      .then((contents) => setResult({ id, contents, failed: false }))
      .catch((error: unknown) => {
        // An abort is this component tidying up after itself, not a failure to report.
        if (controller.signal.aborted) return;
        console.error("[deepcuts] pack failed:", error);
        setResult({ id, contents: null, failed: true });
      });

    return () => controller.abort();
  }, [playlist]);

  /* The rip, stamped with its pack for the same reason the contents are: opening one
     pack, closing it and opening another must not show the first one's cards under the
     second one's name. */
  const [pulled, setPulled] = useState<{
    id: string;
    cards: PackCard[];
    error?: string;
  } | null>(null);
  /**
   * WHERE IN THE SEQUENCE THE PACK IS, and it is a phase rather than a boolean because
   * the rip is four beats: forward, tear, flash, cards. A boolean can say "busy" and
   * cannot say which of those is on screen.
   *
   *   idle     the wrapper, sealed, with a live button
   *   tearing  the pack has come forward and the top is coming away
   *   flashing white, covering the swap from wrapper to cards
   *   opened   the pack is gone and the cards are out
   */
  const [phase, setPhase] = useState<"idle" | "tearing" | "flashing" | "opened">("idle");

  /* Only an answer stamped with the pack now on screen counts. Anything else is the
     previous pack's, still in flight or already landed, and it renders as loading. */
  const shown = playlist && result?.id === playlist.id ? result : null;
  const pack = playlist && pulled?.id === playlist.id ? pulled : null;

  const rip = async () => {
    if (!playlist || phase !== "idle") return;

    const id = playlist.id;

    /* THE ANIMATION AND THE REQUEST START TOGETHER AND THE CARDS WAIT FOR BOTH. Running
       them in series would mean staring at a torn pack while last.fm is asked fifty
       questions; running the animation alone would cut to cards that are not there yet.

       The timers drive the visible beats, the promise resolves whenever it resolves, and
       Promise.all below is what makes the slower of the two the one that decides. */
    setPhase("tearing");
    window.setTimeout(() => setPhase("flashing"), RIP_FORWARD_MS + RIP_TEAR_MS);

    const sequence = new Promise<void>((resolve) =>
      window.setTimeout(resolve, RIP_SEQUENCE_MS)
    );

    const dealt = ripPack({ playlist_id: id }).catch((error: unknown) => {
      console.error("[deepcuts] rip failed:", error);
      return { playlist_id: id, cards: [], error: DEEPCUTS_TEASER.rip_failed };
    });

    const [answer] = await Promise.all([dealt, sequence]);

    setPulled({ id, cards: answer.cards, error: answer.error });
    /* Back to idle when the rip was refused, so the button can be pressed again. A pack
       that failed to open is still a sealed pack. */
    setPhase(answer.cards.length ? "opened" : "idle");
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      /* Escape and the close button both come through here, so the parent's state and
         the element's own open flag cannot drift apart. */
      onClose={onClose}
      /* Clicking the page behind closes. The check is what makes it the BACKDROP rather
         than any click: a <dialog> is its own event target, so a click that landed on
         the content bubbles up with that content as its target, and only a click on the
         dialog element itself is one that missed. */
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
    >
      {/* AnimatePresence is what lets the pack animate OUT. React unmounts the tree the
          moment the playlist goes null, so without something holding it on screen the
          close is a hard cut however carefully the open was tuned. */}
      <AnimatePresence>
        {playlist ? (
          <div className={styles.stage}>
            <button
              type="button"
              className={styles.dialogClose}
              onClick={() => ref.current?.close()}
            >
              {DEEPCUTS_TEASER.dialog_close}
            </button>

            {/* THE PACK IS GONE ONCE IT IS OPEN. A torn wrapper sitting above the cards
                it produced is litter: the thing the reader wanted is the cards, and the
                pack has done its job. AnimatePresence is what lets it leave rather than
                vanish. */}
            <AnimatePresence>
              {phase !== "opened" ? (
            <motion.div
              key="pack"
              initial={still ? false : { scale: 0.82, y: 26, opacity: 0 }}
              /* Forward on the rip, which is the first beat: the wrapper comes toward
                 the reader before anything happens to it. */
              animate={{
                scale: phase === "idle" ? 1 : 1.12,
                y: 0,
                opacity: 1,
              }}
              exit={still ? undefined : { scale: 1.3, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.7 }}
              className={styles.openedShell}
            >
            <TiltedPack className={styles.opened} plain={!playlist.cover}>
              {/* THE TEAR. The serrated top and the crimp band come away together,
                  because on a real pack they are one strip of foil: it is pulled off in
                  one piece along the perforation, not peeled in layers. */}
              <motion.span
                className={styles.tearStrip}
                animate={
                  phase === "idle" || still
                    ? { y: 0, rotate: 0, opacity: 1 }
                    : { y: -64, rotate: -9, opacity: 0 }
                }
                transition={{ duration: RIP_TEAR_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
              >
                <span className={styles.shelfTeeth} aria-hidden="true" />

                <span className={styles.shelfStrip}>
                  <span className={styles.stripLabel}>{DEEPCUTS_TEASER.rip_label}</span>
                  <span className={styles.stripNote}>{DEEPCUTS_TEASER.rip_note}</span>
                </span>
              </motion.span>

              {playlist.cover ? (
                <span className={styles.openedArt} aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.shelfCover}
                    src={playlist.cover}
                    alt=""
                    width={320}
                    height={320}
                  />
                </span>
              ) : null}

              <span className={styles.openedBody}>
                {/* The playlist's name, and NOT an <h2>: the site's reset sets every
                    heading lowercase by design, which mangled "Portfolio Playlist (Local
                    Env)" while the pack behind it kept its capitals. The dialog is still
                    named by it through aria-labelledby. */}
                <span className={styles.openedName} id={titleId}>
                  {playlist.name}
                </span>
                <span className={styles.openedMeta}>
                  {playlist.track_count === 1
                    ? DEEPCUTS_TEASER.shelf_count_one
                    : `${playlist.track_count} ${DEEPCUTS_TEASER.shelf_count_many}`}
                </span>
              </span>

              <span className={styles.shelfFoot} aria-hidden="true" />
            </TiltedPack>
            </motion.div>
              ) : null}
            </AnimatePresence>

            {/* The flash. Covers the moment the wrapper is replaced by the cards, which
                is the one frame where both would otherwise be on screen at once. */}
            <AnimatePresence>
              {phase === "flashing" && !still ? (
                <motion.div
                  key="flash"
                  className={styles.flash}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: RIP_FLASH_MS / 1000, ease: "easeOut" }}
                  aria-hidden="true"
                />
              ) : null}
            </AnimatePresence>

            {/* Across the foot of the pack, as on the sketch. It opens the pack now.
                Disabled while the contents are still arriving, because the rip is dealt
                from the same scored tracks the table below is waiting on, and while
                last.fm is switched off, because nothing could be given a rung. */}
            {/* Goes with the pack. A button offering to open something that is already
                open is a control with nothing left to do. */}
            {phase !== "opened" ? (
              <button
                type="button"
                className={styles.rip}
                onClick={rip}
                disabled={phase !== "idle" || !shown?.contents?.scored}
              >
                {phase === "idle" ? DEEPCUTS_TEASER.rip_button : DEEPCUTS_TEASER.rip_working}
              </button>
            ) : null}

            {/* One line under the button, saying whichever thing is true. */}
            {pack?.error ? (
              <p className={styles.ripNote}>{pack.error}</p>
            ) : shown?.contents && !shown.contents.scored ? (
              <p className={styles.ripNote}>{DEEPCUTS_TEASER.rip_blocked_unscored}</p>
            ) : null}

            {/* The five cards, once they exist. Above the track list, because they are
                what the reader just did and the list is reference. */}
            {pack?.cards.length ? (
              <CardStack cards={pack.cards} playlistName={playlist.name} />
            ) : null}

            {/* THE ONLY SCROLLING REGION ON THE SCREEN. Everything above it is fixed. */}
            <div className={styles.pile}>
              {shown?.failed ? (
                <p className={styles.dialogNote}>{DEEPCUTS_TEASER.dialog_failed}</p>
              ) : !shown?.contents ? (
                <p className={styles.dialogNote}>{DEEPCUTS_TEASER.dialog_loading}</p>
              ) : (
                <>
                  {/* Says what was scored and what was not, before the list rather than
                      after it. A reader who scrolls fifty rows and only then learns the
                      playlist has three hundred songs has been misled for fifty rows. */}
                  <p className={styles.dialogNote}>
                    {shown.contents.scored
                      ? `${shown.contents.tracks.length} of ${shown.contents.track_count} ${DEEPCUTS_TEASER.dialog_scored}`
                      : DEEPCUTS_TEASER.dialog_unscored}
                  </p>

                  {/* A TABLE, BECAUSE IT IS ONE NOW. Three columns of the same kind of fact
                  per row is what a table is for, and the list of stacked spans it
                  replaced was a table drawn without saying so - which cost a screen
                  reader the column headings and cost the layout its alignment. */}
              <table className={styles.cards}>
                <thead>
                  <tr>
                    <th scope="col">{DEEPCUTS_TEASER.col_track}</th>
                    <th scope="col">{DEEPCUTS_TEASER.col_card}</th>
                    <th scope="col" className={styles.colChance}>
                      {DEEPCUTS_TEASER.col_chance}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.contents.tracks.map((track, index) => (
                    <tr
                      key={track.uri || `${track.title}-${index}`}
                      className={styles.card}
                      data-tier={track.tier ?? undefined}
                    >
                      <td>
                        <span className={styles.cardTrack}>
                          {/* The record it came off. Album art, so the exact host check
                              is i.scdn.co rather than the playlist cover's wider one;
                              pickAlbumArt in the mappers is the one that knows which. */}
                          {track.album_art ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              className={styles.cardArt}
                              src={track.album_art}
                              alt=""
                              width={72}
                              height={72}
                            />
                          ) : (
                            /* Never a broken image, and never a gap: a track with no
                               artwork keeps the column aligned with a quiet square. */
                            <span className={styles.cardArtEmpty} aria-hidden="true" />
                          )}

                          <span className={styles.cardMain}>
                            <span className={styles.cardTitle}>{track.title}</span>
                            <span className={styles.cardArtist}>{track.artist}</span>
                          </span>
                        </span>
                      </td>

                      <td>
                        <span className={styles.cardTierCell}>
                          <span className={styles.cardSwatch} aria-hidden="true" />
                          {/* A rung with no count behind it is not a rung. Both are
                              absent together, which is what rarityOf guarantees. */}
                          <span className={styles.cardTier}>
                            {track.tier
                              ? DEEPCUT_TIER[track.tier].label
                              : DEEPCUTS_TEASER.dialog_unmatched}
                          </span>
                        </span>
                      </td>

                      <td className={styles.colChance}>
                        {/* ZERO IS NOT A NUMBER TO PRINT HERE. It means the hit slot
                            cannot reach this rung on this playlist, so the track can
                            still be dealt - it just can never be the card the pack was
                            opened for. "0.0%" would read as "you will never see this",
                            which is the opposite of what it says. */}
                        <span
                          className={`${styles.cardChance} ${track.chance === 0 ? styles.cardChanceNone : ""}`}
                        >
                          {track.chance === null
                            ? ""
                            : track.chance === 0
                              ? DEEPCUTS_TEASER.chance_common_only
                              : `${track.chance.toFixed(1)}%`}
                        </span>
                        {/* The plays sit under the chance, abbreviated: a column of
                            1,333,333 and 847,201 is unreadable at a glance and the exact
                            digit was never the point. */}
                        {track.plays !== null ? (
                          <span className={styles.cardPlays}>
                            {compactCount(track.plays)} {DEEPCUTS_TEASER.dialog_plays}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className={styles.dialogNote}>{DEEPCUTS_TEASER.chance_note}</p>

                  <a
                    className={styles.dialogOpen}
                    href={playlist.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {DEEPCUTS_TEASER.dialog_spotify}
                  </a>
                </>
              )}
            </div>
          </div>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
};
