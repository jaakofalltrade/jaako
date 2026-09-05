import { DEEPCUT_TIER } from "@/constants";
import { DEEPCUTS_TEASER } from "@/data/lab";
import type { DeepcutsLibrary, DeepcutsStats } from "@/models";
import styles from "./deepcuts.module.scss";

export type StatStripProps = {
  stats: DeepcutsStats;
  /**
   * The shelf, for resolving a playlist id to a name.
   *
   * The database holds the id and nothing else about the playlist, deliberately: a row
   * of ours annotates something of Spotify's and never conjures it. So the name has to
   * come from the same read that drew the packs, and renaming a playlist renames it
   * here too. Null when Spotify could not be read at all, which leaves the line naming
   * no playlist rather than naming an id.
   */
  library: DeepcutsLibrary;
};

/**
 * The two figures beside the title: most-opened pack, and rarest card pulled.
 *
 * BOTH READ "nothing yet" TODAY AND THAT IS THE STATE THIS WAS BUILT FOR. Nothing opens
 * a pack, so pack_rip and pack_card are empty by construction. The alternative was to
 * leave the block out until the rip exists, and it is here instead because the shape of
 * the page is the thing being designed: two figures that appear later would change the
 * masthead's layout on the day they arrive.
 *
 * It is a <dl> rather than two paragraphs. Each line is a label and a value, which is
 * what a definition list is, and it is the same call the rules readout further down the
 * page makes. Written out rather than the site's DefinitionList component, for the
 * reason that readout gives: that component carries the site's jk- classes into the
 * global cascade, and a bare lab app owns its own type.
 */
export const StatStrip = ({ stats, library }: StatStripProps) => {
  const { most_opened, rarest_card } = stats;

  /* The name of the most-opened playlist, or a sentence saying why there is none. A
     playlist that has been ripped and has since been deleted or made private is a real
     state, and it reads better than an id nobody can look up. */
  const mostOpened = most_opened
    ? (library?.find((playlist) => playlist.id === most_opened.playlist_id)?.name ??
      DEEPCUTS_TEASER.stat_unknown_pack)
    : DEEPCUTS_TEASER.stat_none;

  const rarest = rarest_card
    ? `${DEEPCUT_TIER[rarest_card.tier].label}, ${rarest_card.title}`
    : DEEPCUTS_TEASER.stat_none;

  return (
    <dl className={styles.stats}>
      <div className={styles.statRow}>
        <dt className={styles.statTerm}>{DEEPCUTS_TEASER.stat_most_opened}</dt>
        <dd className={styles.statValue}>{mostOpened}</dd>
      </div>

      <div className={styles.statRow}>
        <dt className={styles.statTerm}>{DEEPCUTS_TEASER.stat_rarest_card}</dt>
        <dd className={styles.statValue}>{rarest}</dd>
      </div>
    </dl>
  );
};
