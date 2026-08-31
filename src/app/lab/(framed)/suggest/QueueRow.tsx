"use client";

import { RowState } from "@/models";
import type { QueueEntry } from "@/models";
import { SUGGEST_TEASER } from "@/data/lab";
import { getShortDate } from "@/oras";
import type { Timezone } from "@/oras";
import { getMinutesSeconds } from "@/oras/milliseconds";
import { useTimezone } from "@/oras/useTimezone";
import styles from "./suggest.module.scss";

export type QueueRowProps = {
  entry: QueueEntry;
  state: RowState;
  error?: string;
  index: string;
  onRetry: () => void;
};

/**
 * The date cell's text, or "" when there is nothing honest to put in it.
 *
 * TWO SEPARATE REASONS TO RENDER NOTHING, and they are worth keeping distinct even
 * though they produce the same cell. A null `timezone` means the browser has not taken
 * over yet, so the date is a moment away; a null `added_at` means Spotify never told
 * us when this track was added, so it is never coming. The first is a frame of
 * latency, the second is a fact about the row.
 *
 * Empty rather than a placeholder, because .rowWhen is a grid column of its own and an
 * absent value leaves a gap rather than shifting the columns beside it — the same
 * reasoning as the omitted `added_by` cell below.
 */
const addedOn = (args: { entry: QueueEntry; timezone: Timezone | null }): string => {
  const { entry, timezone } = args;
  if (!timezone || !entry.added_at) return "";

  return getShortDate.fromIsoDateTimeUtc({ iso_date_time_utc: entry.added_at, timezone });
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
export const QueueRow = ({ entry, state, error, index, onRetry }: QueueRowProps) => {
  /*
   * THE DATE IS THE READER'S, WHICH MEANS THE SERVER CANNOT WRITE IT. useTimezone
   * hands back null until React has committed in the browser, so the cell is empty in
   * the server's HTML and fills in on the first client render. See the note in
   * oras/useTimezone.ts for why guessing here would be a hydration mismatch rather
   * than a convenience.
   */
  const timezone = useTimezone();

  return (
    <li className={styles.row} data-state={state.toLowerCase()}>
      <span className={styles.rowIndex} aria-hidden="true">{index}</span>

      {entry.album_art ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className={styles.rowArt} src={entry.album_art} alt="" width={36} height={36} />
      ) : (
        <span className={styles.rowArtEmpty} aria-hidden="true" />
      )}

      {/* The inner span is what moves; the cell is the window it moves inside. See
          .scroll in the module for why this is not the Marquee component. */}
      <span className={styles.rowBody}>
        <span className={`${styles.rowTitle} ${styles.scroll}`}>
          <span>{entry.title}</span>
        </span>
        <span className={`${styles.rowArtist} ${styles.scroll}`}>
          <span>{entry.artist}</span>
        </span>
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
          <span className={`${styles.rowAlbum} ${styles.scroll}`}>
            <span>{entry.album}</span>
          </span>

          {/* Omitted rather than rendered empty. Every cell names its own grid column,
              so an absent one leaves a gap instead of shifting the rest along - and on a
              phone, where the name has a line to itself, an empty cell would otherwise
              leave every unattributed row a blank line taller than the ones beside it. */}
          {entry.added_by ? (
            <span className={`${styles.rowBy} ${styles.scroll}`}>
              <span>{entry.added_by}</span>
            </span>
          ) : null}

          <span className={styles.rowWhen}>
            {state === RowState.Adding ? SUGGEST_TEASER.adding : addedOn({ entry, timezone })}
          </span>

          <span className={styles.rowTime}>
            {getMinutesSeconds.fromMilliseconds({ milliseconds: entry.duration_ms })}
          </span>
        </>
      )}
    </li>
  );
};
