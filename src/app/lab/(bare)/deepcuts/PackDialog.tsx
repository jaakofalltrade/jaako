"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPack } from "@/client/deepcutsApi";
import { DEEPCUT_TIER } from "@/constants";
import { DEEPCUTS_TEASER } from "@/data/lab";
import type { DeepcutsPlaylist, PackContents } from "@/models";
import styles from "./deepcuts.module.scss";

export type PackDialogProps = {
  /** The pack that was clicked. Null when nothing is open. */
  playlist: DeepcutsPlaylist | null;
  onClose: () => void;
};

/**
 * The opened pack: the wrapper brought to the front, and what is inside it.
 *
 * A NATIVE <dialog>, NOT A DIV WITH A HIGH z-index. showModal() gives four things that
 * are each a small pile of code to do by hand and easy to get subtly wrong: the rest of
 * the page becomes inert to the pointer and to a screen reader, focus is trapped inside,
 * Escape closes, and it renders in the top layer so no stacking context on the page can
 * cover it. The backdrop is a real ::backdrop pseudo-element, which is what the blur is
 * painted on.
 *
 * THE BLUR IS ON ::backdrop AND NOT ON THE PAGE. Blurring the page itself would mean a
 * filter on a wrapper, and a filter creates a containing block - which would drag the
 * fixed-position ground out from under everything and repaint the whole document. The
 * backdrop sits between the page and the dialog and costs the page nothing.
 *
 * The counts are fetched when a pack opens rather than with the shelf: scoring one
 * playlist is one Spotify read plus up to fifty last.fm ones, and doing that for
 * seventy-five packs to paint a grid nobody has opened would be thousands of requests
 * per page view.
 */
export const PackDialog = ({ playlist, onClose }: PackDialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  /* ONE PIECE OF STATE, STAMPED WITH THE PACK IT BELONGS TO, rather than a contents and
     a failed flag cleared on every open. Clearing them in the effect was the first
     version and it was wrong twice over: it is a synchronous setState inside an effect,
     which cascades a render, and it only papered over the real problem. The real problem
     is that a slow answer for pack A can land after pack B has been opened, and no
     amount of clearing beforehand prevents that - the id does. */
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

  /* Only an answer stamped with the pack now on screen counts. Anything else is the
     previous pack's, still in flight or already landed, and it renders as loading. */
  const shown = playlist && result?.id === playlist.id ? result : null;

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      /* Escape and the close button both come through here, so the parent's state and
         the element's own open flag cannot drift apart. */
      onClose={onClose}
      /* Clicking the backdrop closes. The check is what makes it the BACKDROP rather
         than any click: a <dialog> is its own event target, so a click that landed on
         the content bubbles up with the panel as its target, and only a click on the
         dialog element itself is one that missed. */
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
    >
      {playlist ? (
        <div className={styles.dialogPanel}>
          <header className={styles.dialogHead}>
            <div>
              <p className={styles.dialogLabel}>{DEEPCUTS_TEASER.dialog_label}</p>
              <h2 className={styles.dialogName}>{playlist.name}</h2>
            </div>

            <button
              type="button"
              className={styles.dialogClose}
              onClick={() => ref.current?.close()}
            >
              {DEEPCUTS_TEASER.dialog_close}
            </button>
          </header>

          {/* The wrapper, opened. Not a second copy of the pack: the shelf's own pack
              is what the reader clicked and this is what was under it. */}
          {playlist.cover ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className={styles.dialogCover} src={playlist.cover} alt="" width={120} height={120} />
          ) : null}

          {shown?.failed ? (
            <p className={styles.dialogNote}>{DEEPCUTS_TEASER.dialog_failed}</p>
          ) : !shown?.contents ? (
            <p className={styles.dialogNote}>{DEEPCUTS_TEASER.dialog_loading}</p>
          ) : (
            <>
              {/* Says what was scored and what was not, before the list rather than
                  after it. A reader who scrolls a list of fifty and only then learns
                  the playlist has three hundred songs has been misled for fifty rows. */}
              <p className={styles.dialogNote}>
                {shown.contents.scored
                  ? `${shown.contents.tracks.length} of ${shown.contents.track_count} ${DEEPCUTS_TEASER.dialog_scored}`
                  : DEEPCUTS_TEASER.dialog_unscored}
              </p>

              <ol className={styles.cards}>
                {shown.contents.tracks.map((track, index) => (
                  <li
                    key={track.uri || `${track.title}-${index}`}
                    className={styles.card}
                    data-tier={track.tier ?? undefined}
                  >
                    <span className={styles.cardSwatch} aria-hidden="true" />

                    <span className={styles.cardMain}>
                      <span className={styles.cardTitle}>{track.title}</span>
                      <span className={styles.cardArtist}>{track.artist}</span>
                    </span>

                    <span className={styles.cardRarity}>
                      {/* A rung with no count behind it is not a rung. Both are absent
                          together, which is what rarityOf guarantees. */}
                      <span className={styles.cardTier}>
                        {track.tier ? DEEPCUT_TIER[track.tier].label : DEEPCUTS_TEASER.dialog_unmatched}
                      </span>

                      {track.plays !== null ? (
                        <span className={styles.cardPlays}>
                          {track.plays.toLocaleString()} {DEEPCUTS_TEASER.dialog_plays}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>

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
      ) : null}
    </dialog>
  );
};
