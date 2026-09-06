import { DEEPCUT_LADDER, DEEPCUT_TIER, HIT_SLOT_ODDS, SHINY_ODDS } from "@/constants";
import { DEEPCUTS_TEASER } from "@/data/lab";
import styles from "./deepcuts.module.scss";

/**
 * The cards tab: one face per rung, and the shiny finish beside the three that can roll
 * it.
 *
 * WHAT IT IS FOR, GIVEN THE LEGEND ALREADY LISTS THE RUNGS. The legend is a table of
 * thresholds and sentences - it answers "what does deep cut mean". This answers "what
 * does a deep cut LOOK like", which is a different question and the one somebody about
 * to open a pack is actually asking. It is also the only place shiny can be shown, since
 * shiny is a finish rather than a rung and has no row on the ladder.
 *
 * NOT A COLLECTION. Nothing has been pulled, so this cannot be "your cards" - it is the
 * set, the way the back of a booster box prints what is in the set. When the rip exists
 * and cards persist, a real collection is a different tab again.
 *
 * A server component: it renders constants and has no state.
 */
export const CardGallery = () => (
  <>
    <p className={styles.ladderNote}>{DEEPCUTS_TEASER.cards_note}</p>

    <ul className={styles.gallery}>
      {DEEPCUT_LADDER.map((tier) => {
        const rung = DEEPCUT_TIER[tier];
        const shiny = SHINY_ODDS[tier];
        const hit = HIT_SLOT_ODDS[tier];

        return (
          <li key={tier} className={styles.galleryItem}>
            {/* The ordinary finish. */}
            <span className={styles.face} data-tier={tier}>
              <span className={styles.faceLabel}>{rung.label}</span>
            </span>

            {/* And the holographic one, for the three rungs that can roll it. Printed
                beside its plain twin rather than on its own, because the whole point of a
                shiny is that it is the same card and rarer. */}
            {shiny ? (
              <span className={`${styles.face} ${styles.shiny}`} data-tier={tier}>
                <span className={styles.faceLabel}>{rung.label}</span>
              </span>
            ) : (
              /* Holds the column so every row lines up, whether or not the rung has a
                 shiny twin. An empty cell here is quieter than a ragged grid. */
              <span className={styles.faceEmpty} aria-hidden="true" />
            )}

            <span className={styles.galleryMeta}>
              <span className={styles.galleryName}>{rung.label}</span>

              {/* HOW OFTEN THE PULL IS THIS RUNG, which used to be printed per track in
                  the pack panel and had no home once that panel stopped listing its own
                  contents. It belongs here rather than there anyway: it is a property of
                  the ladder and the same on every playlist, where the per-track figure
                  was neither. Rungs above album cut carry no weight at all - they arrive
                  in the four common slots and are never the card a pack rolls for. */}
              <span className={styles.galleryOdds}>
                {hit
                  ? `${(hit * 100).toFixed(0)}% ${DEEPCUTS_TEASER.gallery_of_pulls}`
                  : DEEPCUTS_TEASER.gallery_common_only}
              </span>

              <span className={styles.galleryOdds}>
                {shiny
                  ? `${DEEPCUTS_TEASER.shiny_label} ${(shiny * 100).toFixed(2)}%`
                  : DEEPCUTS_TEASER.shiny_never}
              </span>
            </span>
          </li>
        );
      })}
    </ul>

    <p className={styles.source}>{DEEPCUTS_TEASER.shiny_note}</p>
  </>
);
