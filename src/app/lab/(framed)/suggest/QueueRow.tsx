"use client";

import { RowState } from "@/models";
import type { QueueEntry } from "@/models";
import { SUGGEST_TEASER } from "@/data/lab";
import { clock, shortDate } from "@/utils/format";
import styles from "./suggest.module.scss";

export type QueueRowProps = {
  entry: QueueEntry;
  state: RowState;
  error?: string;
  index: string;
  onRetry: () => void;
};

/**
 * One row of the playlist as the page shows it.
 *
 * Three states rather than two, because the list is updated optimistically. Adding is a
 * claim the server has not confirmed; Failed is what stops that claim becoming a quiet
 * lie, and it carries the reason and a way to try again rather than just vanishing.
 *
 * A row is not a link. The whole card at the top of the page opens Spotify, and giving
 * every row its own target would mean nine ways to leave the page and no obvious one.
 *
 * THE COVER COSTS NOTHING. Album art is already on the playlist projection the page
 * makes anyway - album(name,images) - and toQueueEntry already maps it, so rendering it
 * is not one extra request, it is a field that was arriving and being thrown away.
 */
export const QueueRow = ({ entry, state, error, index, onRetry }: QueueRowProps) => (
  <li className={styles.row} data-state={state.toLowerCase()}>
    <span className={styles.rowIndex} aria-hidden="true">{index}</span>

    {entry.album_art ? (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img className={styles.rowArt} src={entry.album_art} alt="" width={36} height={36} />
    ) : (
      <span className={styles.rowArtEmpty} aria-hidden="true" />
    )}

    <span className={styles.rowBody}>
      <span className={styles.rowTitle}>{entry.title}</span>
      <span className={styles.rowArtist}>{entry.artist}</span>
    </span>

    {/* FAILED COLLAPSES THE REMAINING COLUMNS INTO ONE. A row that did not land has
        nothing true to say about who added it or when, and leaving those cells filled
        from the optimistic guess would be the row insisting on a fact it just lost. */}
    {state === RowState.Failed ? (
      <span className={styles.rowFailure}>
        <span className={styles.rowError}>{error ?? SUGGEST_TEASER.add_failed}</span>
        <button type="button" className={styles.change} onClick={onRetry}>
          try again
        </button>
      </span>
    ) : (
      <>
        <span className={styles.rowAlbum}>{entry.album}</span>

        <span className={styles.rowBy}>{entry.added_by ?? ""}</span>

        <span className={styles.rowWhen}>
          {state === RowState.Adding ? SUGGEST_TEASER.adding : shortDate({ iso: entry.added_at })}
        </span>

        <span className={styles.rowTime}>{clock(entry.duration_ms)}</span>
      </>
    )}
  </li>
);
