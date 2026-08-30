import { IconName } from "@/models";
import { SUGGEST_TEASER } from "@/data/lab";
import { Icon } from "@/design-system/Icon";
import styles from "./suggest.module.scss";

/**
 * The column headings over the playlist.
 *
 * NOT A <table>, AND THE ROWS ARE NOT <tr>. This is a list of tracks that happens to
 * line up in columns, not tabular data: there is nothing to sort, nothing to compare
 * down a column, and every row is one object rather than a set of measurements. A
 * <ul> of grid rows says that, and it degrades to a readable stack on a narrow screen
 * without any of the work a real table needs to do the same.
 *
 * The headings therefore carry aria-hidden. They are a visual alignment aid; a screen
 * reader gets the row's own content in order, which reads as a sentence, rather than
 * four announced column names it cannot navigate by.
 *
 * Two cells are deliberately empty: the index and the cover have nothing to label.
 */
export const QueueHead = () => (
  <li className={styles.head} aria-hidden="true">
    <span />
    <span />
    <span>{SUGGEST_TEASER.columns.title}</span>
    <span>{SUGGEST_TEASER.columns.album}</span>
    <span>{SUGGEST_TEASER.columns.by}</span>
    <span>{SUGGEST_TEASER.columns.when}</span>
    <span className={styles.headClock}>
      <Icon name={IconName.Clock} size={13} />
    </span>
  </li>
);
