"use client";

import { RowState } from "@/models";
import type { QueueEntry } from "@/models";
import { SUGGEST_TEASER } from "@/data/lab";
import { clock } from "@/utils/format";
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
 */
export const QueueRow = ({ entry, state, error, index, onRetry }: QueueRowProps) => (
  <li className={styles.row} data-state={state.toLowerCase()}>
    <span className={styles.rowIndex} aria-hidden="true">{index}</span>

    <span className={styles.rowBody}>
      <span className={styles.rowTitle}>{entry.title}</span>
      <span className={styles.rowArtist}>{entry.artist}</span>
    </span>

    <span className={styles.rowMeta}>
      {state === RowState.Failed ? (
        <>
          <span className={styles.rowError}>{error ?? SUGGEST_TEASER.add_failed}</span>
          <button type="button" className={styles.change} onClick={onRetry}>
            try again
          </button>
        </>
      ) : (
        <>
          {entry.added_by ? (
            <span className={styles.rowBy}>added by {entry.added_by}</span>
          ) : null}
          <span className={styles.rowTime}>
            {state === RowState.Adding ? SUGGEST_TEASER.adding : clock(entry.duration_ms)}
          </span>
        </>
      )}
    </span>
  </li>
);
