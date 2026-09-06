"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { fetchPack, ripPack } from "@/client/deepcutsApi";
import {
  RIP_FLASH_MS,
  RIP_FORWARD_MS,
  RIP_SEQUENCE_MS,
  RIP_TEAR_MS,
} from "@/constants";
import { DEEPCUTS_TEASER } from "@/data/lab";
import type { DeepcutsPlaylist, PackCard, PackContents } from "@/models";
import { CardStack } from "./CardStack";
import { Sparkles } from "./Sparkles";
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
 * WHAT DID GO IS THE MODAL'S LOOK. The dialog paints nothing: no panel, no border, no
 * shadow, no scrollbar of its own. The pack is the only thing on screen, over a blurred
 * page.
 *
 * A SEALED PACK SHOWS NOTHING OF WHAT IS INSIDE IT, WHICH IS THE POINT OF ONE. This
 * panel used to carry the whole scored playlist under the wrapper - every track, its
 * rung, its odds - so a reader could study the contents and then open a pack whose
 * surprise had already been spent. Reading the list through the foil is not a feature.
 * What is left is the wrapper, the button, one line saying why the button might not
 * work, and afterwards the five cards.
 *
 * THE CONTENTS ARE STILL FETCHED, AND NOT OUT OF INERTIA. Two things want them: the
 * button has to know whether the playlist can be scored at all before it offers to open
 * one, and the rip reads the very same cache - so this request is what makes the rip land
 * inside the tear animation rather than after it. What changed is that nothing renders
 * them.
 *
 * The pull odds that used to sit in that table are not lost: the rate a card rolls each
 * rung is on the set tab, where it belongs, and it is a property of the ladder rather
 * than of any one playlist.
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
   *
   * STAMPED WITH ITS PACK, LIKE THE OTHER TWO, AND IT WAS NOT. As a bare phase it
   * survived the dialog closing, so ripping one pack and then opening a DIFFERENT one
   * left it reading "opened": the wrapper is suppressed at that phase and so is the
   * button, while the cards belong to the other playlist and do not render. The dialog
   * came up holding a close button and a link to Spotify and nothing else. Reproduced
   * by hand - rip "Sorry You're Not a Winner", close, open "coding".
   *
   * The id is the fix rather than an effect that clears on `playlist`: this file already
   * stamps its other two pieces of state for exactly this reason, and a derived phase
   * cannot be forgotten the way a reset can.
   */
  const [ripping, setRipping] = useState<{
    id: string;
    phase: "idle" | "tearing" | "flashing" | "opened";
  } | null>(null);

  /* Only an answer stamped with the pack now on screen counts. Anything else is the
     previous pack's, still in flight or already landed, and it renders as loading. */
  const shown = playlist && result?.id === playlist.id ? result : null;
  const pack = playlist && pulled?.id === playlist.id ? pulled : null;
  const phase = playlist && ripping?.id === playlist.id ? ripping.phase : "idle";

  const rip = async () => {
    if (!playlist || phase !== "idle") return;

    const id = playlist.id;

    /* THE ANIMATION AND THE REQUEST START TOGETHER AND THE CARDS WAIT FOR BOTH. Running
       them in series would mean staring at a torn pack while last.fm is asked fifty
       questions; running the animation alone would cut to cards that are not there yet.

       The timers drive the visible beats, the promise resolves whenever it resolves, and
       Promise.all below is what makes the slower of the two the one that decides. */
    setRipping({ id, phase: "tearing" });
    window.setTimeout(() => setRipping({ id, phase: "flashing" }), RIP_FORWARD_MS + RIP_TEAR_MS);

    const sequence = new Promise<void>((resolve) =>
      window.setTimeout(resolve, RIP_SEQUENCE_MS)
    );

    /* THE SHINY PREVIEW RIDES ON THE PAGE'S OWN URL. Open /lab/deepcuts?shiny=1 on a
       local deployment and every pack comes out with the finish on, which is the only
       practical way to look at a treatment that appears on one card in a hundred. Read
       here rather than through a hook because it is wanted at the moment of a click and
       never at render, and useSearchParams would put this whole tree behind a Suspense
       boundary for a debugging switch. The server ignores it anywhere but local. */
    const shiny = new URLSearchParams(window.location.search).get("shiny") === "1";

    const dealt = ripPack({ playlist_id: id, shiny }).catch((error: unknown) => {
      console.error("[deepcuts] rip failed:", error);
      return { playlist_id: id, cards: [], error: DEEPCUTS_TEASER.rip_failed };
    });

    const [answer] = await Promise.all([dealt, sequence]);

    setPulled({ id, cards: answer.cards, error: answer.error });
    /* Back to idle when the rip was refused, so the button can be pressed again. A pack
       that failed to open is still a sealed pack. */
    setRipping({ id, phase: answer.cards.length ? "opened" : "idle" });
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
                pack has done its job.

                CUT, NOT ANIMATED OUT, AND THE FLASH IS WHY IT CAN BE. This was an
                AnimatePresence exit - the pack blew up to 1.3 and faded - and it broke in
                the worst way an exit can: the animation settled at opacity 0.01 and the
                completion never fired, so AnimatePresence never unmounted the child.
                Measured stuck at that value four seconds later. An invisible element still
                occupies its box, so the wrapper went on holding 450px of the flex column
                and the cards it had just dealt were shoved off the bottom of the panel.

                There is no exit to get stuck now. `opened` begins at the moment the flash
                is at full white and starting to fade, so the swap happens under cover -
                which is the entire reason the flash exists. An animation nobody can see
                is not worth a class of bug that leaves a ghost holding the layout. */}
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

            {/* THE SPARKS, WHICH OUTLIVE THE FLASH. Mounted from the flash and kept
                through `opened` rather than swapped out with the white, so they are still
                travelling while the first cards land - which is what makes them read as
                coming off the cards instead of being part of the wipe. Each sparkle
                animates once and ends at zero opacity, so the layer costs nothing after
                that beyond being mounted. */}
            {(phase === "flashing" || phase === "opened") && !still ? <Sparkles /> : null}

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

            {/* ACROSS THE FOOT OF THE PACK, AND IT GOES WHEN THE PACK DOES. A button
                offering to open something already open is a control with nothing left to
                do.

                FOUR REASONS IT IS DEAD, and the last one is the one worth reading. The
                contents are still arriving; last.fm is switched off, so nothing could be
                given a rung; the rip is mid-sequence; or THE RIP CAME BACK REFUSED. That
                last case used to return the button to life, which invited pressing it
                again - and every reason a rip is refused is a reason the next press
                fails the same way. A visitor over the limit still gets their pack on
                screen, sealed, with the button dead and the sentence under it saying
                which limit. */}
            {phase !== "opened" ? (
              <button
                type="button"
                className={styles.rip}
                onClick={rip}
                disabled={phase !== "idle" || !shown?.contents?.scored || Boolean(pack?.error)}
              >
                {phase === "idle" ? DEEPCUTS_TEASER.rip_button : DEEPCUTS_TEASER.rip_working}
              </button>
            ) : null}

            {/* ONE LINE UNDER THE BUTTON, SAYING WHICHEVER THING IS TRUE. It is the only
                thing the panel says about the contents now, and each branch is a reason
                the button will not work rather than a description of what is inside. */}
            {pack?.error ? (
              <p className={styles.ripNote}>{pack.error}</p>
            ) : shown?.failed ? (
              <p className={styles.ripNote}>{DEEPCUTS_TEASER.dialog_failed}</p>
            ) : shown?.contents && !shown.contents.scored ? (
              <p className={styles.ripNote}>{DEEPCUTS_TEASER.rip_blocked_unscored}</p>
            ) : !shown?.contents && phase === "idle" ? (
              /* The button is disabled until the scoring lands, so something has to say
                 why it is disabled. */
              <p className={styles.ripNote}>{DEEPCUTS_TEASER.dialog_loading}</p>
            ) : null}

            {/* The five cards, once they exist. */}
            {pack?.cards.length ? (
              <CardStack cards={pack.cards} playlistName={playlist.name} />
            ) : null}

            {/* The playlist itself, which is not a spoiler: the wrapper already carries
                its name and its count, and this is the same link the shelf used to
                offer. It sits last so it is the quietest thing on the panel. */}
            <a
              className={styles.dialogOpen}
              href={playlist.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {DEEPCUTS_TEASER.dialog_spotify}
            </a>
          </div>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
};
