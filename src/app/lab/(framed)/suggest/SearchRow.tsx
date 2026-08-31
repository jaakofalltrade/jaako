"use client";

import { NAME_LIMITS } from "@/constants";
import { ButtonVariant } from "@/models";
import type { SearchResult } from "@/models";
import { SUGGEST_TEASER } from "@/data/lab";
import { getMinutesSeconds } from "@/oras/milliseconds";
import { Button } from "@/design-system/core/Button";
import { Field } from "@/design-system/forms/Field";
import { Input } from "@/design-system/forms/Input";
import styles from "./suggest.module.scss";

export type SearchRowProps = {
  track: SearchResult;
  disabled: boolean;
  /** Whether this row's name slab is open. */
  asking: boolean;
  name: string;
  error: string | null;
  onAdd: () => void;
  onNameChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * One search result, and the slab that asks for a name the first time.
 *
 * A SLAB RATHER THAN A DIALOG, which is what keeps this component simple enough to be
 * worth reading. A modal would need focus trapping, escape handling, scroll locking and
 * an aria-modal, none of which the design system has, and all of which are easy to get
 * subtly wrong. The cost is that opening it moves the rows below, which is the thing
 * modals exist to avoid; on a list of eight results that is a small price.
 */
export const SearchRow = ({
  track, disabled, asking, name, error, onAdd, onNameChange, onConfirm, onCancel,
}: SearchRowProps) => (
  <li className={styles.result}>
    <div className={styles.resultRow}>
      {track.album_art ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className={styles.resultArt} src={track.album_art} alt="" width={40} height={40} />
      ) : (
        <span className={styles.resultArtEmpty} aria-hidden="true" />
      )}

      <span className={styles.resultBody}>
        <span className={`${styles.resultTitle} ${styles.scroll}`}>
          <span>{track.title}</span>
        </span>
        <span className={`${styles.resultArtist} ${styles.scroll}`}>
          <span>{track.artist}</span>
        </span>
      </span>

      <span className={styles.resultTime}>
        {getMinutesSeconds.fromMilliseconds({ milliseconds: track.duration_ms })}
      </span>

      <Button variant={ButtonVariant.Ghost} onClick={onAdd} disabled={disabled}>
        add
      </Button>
    </div>

    {asking ? (
      <div className={styles.slab}>
        <Field label={SUGGEST_TEASER.name_label} hint={error ?? SUGGEST_TEASER.name_hint}>
          <Input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder={SUGGEST_TEASER.name_placeholder}
            maxLength={NAME_LIMITS.max}
            autoComplete="off"
            autoFocus
          />
        </Field>

        <div className={styles.slabActions}>
          <Button variant={ButtonVariant.Primary} onClick={onConfirm}>
            {SUGGEST_TEASER.submit_label}
          </Button>
          <button type="button" className={styles.change} onClick={onCancel}>
            cancel
          </button>
        </div>
      </div>
    ) : null}
  </li>
);
