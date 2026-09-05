import { DEEPCUTS_TEASER } from "@/data/lab";
import type { DeepcutsLibrary } from "@/models";
import { PackShelf } from "./PackShelf";
import styles from "./deepcuts.module.scss";

export type ShelfProps = {
  /** Null when Spotify could not be read. See DeepcutsLibrary. */
  library: DeepcutsLibrary;
};

/**
 * The playlists, as a shelf of unopened packs.
 *
 * ONE PACK PER PLAYLIST, WHICH IS THE WHOLE REASON THIS BLOCK CAN BE LIVE WHILE THE
 * REST OF THE PAGE IS A TEASER. The card faces are what this app has no data for yet:
 * a face needs a track, a play count and a rung, and two of those three do not exist
 * until Last.fm is wired up. A wrapper needs a name, a cover and a count, and Spotify
 * hands over all three. So the page shows real packs and still turns over no cards.
 *
 * A SERVER COMPONENT WRAPPING A CLIENT ONE, and the split is where the work is. This
 * half decides whether there is a shelf at all, which is a question about a fetch and
 * belongs on the server. PackShelf below it holds the page number, which is state and
 * belongs in the browser. Nothing crosses but the playlists themselves.
 */
export const Shelf = ({ library }: ShelfProps) => {
  /* Reads degrade. A shelf that cannot be read renders as nothing at all rather than as
     an apology: the ladder and the rules under it still explain the app perfectly well,
     and a visitor who never knew there was a list here is not missing anything. */
  if (!library) return null;

  return (
    <section className={styles.shelf}>
      <h2 className={styles.shelfHead}>{DEEPCUTS_TEASER.shelf_label}</h2>
      <p className={styles.shelfNote}>{DEEPCUTS_TEASER.shelf_note}</p>

      {library.length === 0 ? (
        // Read fine, nothing qualified. A true sentence, not an error: see the note on
        // DeepcutsLibrary for why this is not the same state as the null above.
        <p className={styles.shelfEmpty}>{DEEPCUTS_TEASER.shelf_empty}</p>
      ) : (
        <PackShelf playlists={library} />
      )}
    </section>
  );
};
