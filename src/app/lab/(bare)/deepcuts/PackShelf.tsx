"use client";

import { useState } from "react";
import { PACKS_PER_PAGE } from "@/constants";
import { DEEPCUTS_TEASER } from "@/data/lab";
import type { DeepcutsPlaylist } from "@/models";
import { Pagination } from "@/design-system/core/Pagination";
import { PackDialog } from "./PackDialog";
import styles from "./deepcuts.module.scss";

export type PackShelfProps = {
  /** Every public playlist on the account, already filtered and ordered by the server. */
  playlists: DeepcutsPlaylist[];
};

/**
 * The shelf: nine packs, a pager, and the panel a pack opens into.
 *
 * A CLIENT COMPONENT, WHICH IS A DELIBERATE TRADE. The page could page in the URL
 * instead and stay on the server, but this route is force-dynamic and cannot be
 * prefetched, so every page change would be a round trip that re-reads Spotify's library
 * to move between slices of a list the server had already sent in full. Holding the list
 * here costs a few kilobytes once and makes paging instant. It is also what makes
 * opening a pack possible without a navigation.
 *
 * A PACK IS A BUTTON NOW, NOT A LINK, and that is a real change rather than a
 * refactor. It used to be an anchor straight to Spotify. Clicking one opens it instead,
 * and the Spotify link moved inside the panel - which is the honest markup for what the
 * control does: a button does something on this page, an anchor goes somewhere else.
 * Leaving it an anchor would have meant a link that does not navigate, which is the one
 * thing an anchor must not be.
 */
export const PackShelf = ({ playlists }: PackShelfProps) => {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<DeepcutsPlaylist | null>(null);

  const pageCount = Math.ceil(playlists.length / PACKS_PER_PAGE);

  /* Clamped, because the pager is not the only thing that can move the page: a shelf
     that shrinks between renders can leave the state pointing past the end. pageWindow
     clamps for the same reason, and the two have to agree or the pager highlights a
     button whose contents are not on screen. */
  const current = Math.min(Math.max(page, 1), Math.max(pageCount, 1));
  const start = (current - 1) * PACKS_PER_PAGE;
  const shown = playlists.slice(start, start + PACKS_PER_PAGE);

  return (
    <>
      <ul className={styles.packs}>
        {shown.map((playlist) => (
          <li key={playlist.id}>
            <button
              type="button"
              className={styles.shelfPack}
              /* No art at all when there is no cover, rather than a placeholder square.
                 The monogram weave that used to fill the gap was a picture of a card
                 back on the front of a wrapper, and nine of them down a grid read as
                 broken images. A plain foil pack with a name on it is what an
                 unprinted wrapper actually looks like. */
              data-plain={playlist.cover ? undefined : ""}
              onClick={() => setOpen(playlist)}
            >
              {/* The serrated edge, then the crimp band under it. A foil pack is sealed
                  by pressing the sheets together along the top, and both marks that
                  leaves are drawn here. Decorative: a reader hears "tear here, sealed"
                  from the strip, and the teeth say the same thing wordlessly. */}
              <span className={styles.shelfTeeth} aria-hidden="true" />

              <span className={styles.shelfStrip}>
                <span className={styles.stripLabel}>{DEEPCUTS_TEASER.rip_label}</span>
                <span className={styles.stripNote}>{DEEPCUTS_TEASER.rip_note}</span>
              </span>

              {playlist.cover ? (
                /* The cover, printed on the wrapper rather than framed by it. */
                <span className={styles.shelfArt} aria-hidden="true">
                  {/* A plain img, as every other Spotify image on this site is. The host
                      was checked in the mapper; the CSP is the second lock. next/image
                      would want remotePatterns for a CDN whose subdomain rotates, and
                      would buy nothing at this size. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.shelfCover}
                    src={playlist.cover}
                    alt=""
                    width={176}
                    height={176}
                  />
                </span>
              ) : null}

              <span className={styles.shelfBody}>
                <span className={styles.shelfName}>{playlist.name}</span>

                <span className={styles.shelfMeta}>
                  {playlist.track_count === 1
                    ? DEEPCUTS_TEASER.shelf_count_one
                    : `${playlist.track_count} ${DEEPCUTS_TEASER.shelf_count_many}`}
                </span>
              </span>

              {/* The bottom crimp. A pack is pressed at both ends, and without this one
                  the wrapper reads as already torn open. */}
              <span className={styles.shelfFoot} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <Pagination
        page={current}
        pageCount={pageCount}
        onChange={setPage}
        label={DEEPCUTS_TEASER.pager_label}
        previousLabel={DEEPCUTS_TEASER.pager_previous}
        nextLabel={DEEPCUTS_TEASER.pager_next}
        pageLabel={DEEPCUTS_TEASER.pager_page}
        classNames={{
          root: styles.pager,
          button: styles.pagerButton,
          gap: styles.pagerGap,
        }}
      />

      <PackDialog playlist={open} onClose={() => setOpen(null)} />
    </>
  );
};
