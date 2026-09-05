import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { routes } from "@/client/endpoints";
import { DEEPCUTS_TEASER, LAB_APP } from "@/data/lab";
import { LabAppId } from "@/models";
import type { DeepcutsLibrary, DeepcutsStats } from "@/models";
import { deepcutsStore } from "@/server/deepcuts/store";
import { spotifyService } from "@/server/spotify";
import { RulesTabs } from "./RulesTabs";
import { Shelf } from "./Shelf";
import { StatStrip } from "./StatStrip";
import styles from "./deepcuts.module.scss";

const app = LAB_APP[LabAppId.Deepcuts];

export const metadata: Metadata = {
  title: "deepcuts · lab · jaako andes",
  description: "Rip a pack from my playlist. The fewer plays a song has, the rarer the card. Not built yet.",
};

/**
 * /lab/deepcuts. The playlists a pack could come out of, and the ladder it would be
 * scored on.
 *
 * THE SHELF IS LIVE AND NOTHING ELSE ON THE PAGE IS. The playlists are read from
 * Spotify on every request: real names, real covers, real counts, linking out to the
 * real things. It is here before anything opens for the same reason /lab/suggest built
 * its playlist header first - it is the only part of this app that can be true yet, and
 * seeing what a pack would be dealt out of is most of the pitch.
 *
 * That does not make it a card. A pack wrapper needs a name, a cover and a count, and
 * Spotify hands over all three; a card FACE needs a play count and a rung, and Spotify
 * has neither. So the shelf is live and nothing on it has been scored.
 *
 * THE SEALED PACK AND ITS FAN OF FACE-DOWN CARDS USED TO STAND AT THE TOP AND ARE GONE.
 * They were the teaser: an unopened wrapper standing in for an app that could not open
 * one. A shelf of real packs says the same thing better and says it with data, and
 * keeping both meant two pack images on one page competing to be the subject. The tear
 * strip and the card-back weave both survive on the shelf, so nothing about the look
 * went with them.
 *
 * The ladder stays, and it is the one block here that has to. The single thing a
 * visitor cannot guess about this app is that the rarity runs backwards, and a legend
 * where "unheard" beats "chart" explains the whole joke without opening anything. It
 * has moved ABOVE the shelf and folded together with the rules into a tab strip, for
 * the reason written at the point of use: an explanation that arrives after somebody
 * has opened a pack has arrived too late.
 */

/*
 * READS LIVE DATA, SO IT CANNOT BE PRERENDERED. Without this the route builds as static
 * and the shelf is whatever the library held at build time: correct on the first deploy
 * and frozen afterwards, which is the kind of wrong that looks like caching working.
 * The same note sits on /lab/suggest, which learned it first.
 */
export const dynamic = "force-dynamic";

/**
 * How many pack shapes to hold while the library is in flight.
 *
 * A FLOOR RATHER THAN A GUESS, for the reason the queue skeleton on /lab/suggest sets
 * out at greater length: how long the real shelf is cannot be known here, so any count
 * is wrong for some account, and the question is only which way to be wrong. Undershoot
 * and the page grows downward as content lands, which is what every page on the web does
 * while it loads. Overshoot and the ladder below jumps UP into what somebody is reading.
 *
 * Three is one row of the grid rather than the nine a page holds, and about the least
 * that still reads as a row of packs rather than one stray box.
 */
const SHELF_SKELETON_PACKS = [0, 1, 2];

/**
 * The masthead's right-hand column, once the counters land.
 *
 * ITS OWN BOUNDARY, SEPARATE FROM THE SHELF'S, because the two are different fetches
 * against different systems: this is Neon and the shelf is Spotify. One being slow or
 * unreachable must not hold up the other, which is the same rule the Spotify modules
 * already follow among themselves.
 */
const StatBlock = async ({
  stats,
  library,
}: {
  stats: Promise<DeepcutsStats>;
  library: Promise<DeepcutsLibrary>;
}) => <StatStrip stats={await stats} library={await library} />;

/**
 * The shelf, once Spotify answers.
 *
 * Async, and therefore a server component: the token and the whole unfiltered library
 * stay on this side of the boundary.
 */
const ShelfBlock = async ({ library }: { library: Promise<DeepcutsLibrary> }) => (
  <Shelf library={await library} />
);

/**
 * Its shape while that is in flight.
 *
 * Deliberately NOT the site's Skeleton component, for the reason the readout below gives
 * about DefinitionList: that one carries the site's jk- classes into the global cascade,
 * and a bare lab app owns its own everything, this module's header included.
 */
const ShelfSkeleton = () => (
  <div role="status" className={styles.shelfSkeleton}>
    <span className={styles.shelfLoading}>{DEEPCUTS_TEASER.loading_shelf}</span>

    {SHELF_SKELETON_PACKS.map((position) => (
      <span key={position} className={styles.shelfSkeletonPack} aria-hidden="true" />
    ))}
  </div>
);

const DeepcutsPage = () => {
  /* Both started here and awaited inside their own boundaries, so nothing above them
     waits on either. This route is force-dynamic and cannot be prefetched, so a click on
     the lab index would otherwise sit on the old page until both came back.

     The library promise is handed to two boundaries, which is one fetch and not two: a
     promise passed twice is awaited twice rather than run twice. */
  const library = spotifyService.library.playlists();
  const stats = deepcutsStore.stats();

  return (
    <div className={styles.app}>
      <div className={styles.ground} aria-hidden="true" />

      <header className={styles.bar}>
        <Link href={routes.lab.index} className={styles.exit}>
          ←
          <span className={styles.exitLabel}>lab</span>
        </Link>

        <span className={styles.spec} aria-hidden="true">
          {app.index}
        </span>
      </header>

      {/* THE MASTHEAD IS TWO COLUMNS, AND THE SECOND ONE IS WHY THE FIRST IS NO LONGER
          CENTRED. A centred title with a block of figures beside it has no resting
          place: the figures either shove the title off centre or drift away from it.
          Ranged left, the title, the line under it and every block below share one edge,
          and the figures hang off the other. */}
      <div className={styles.masthead}>
        <div className={styles.mastheadMain}>
          <h1 className={styles.title}>{DEEPCUTS_TEASER.title}</h1>
          <p className={styles.subtitle}>{DEEPCUTS_TEASER.subtitle}</p>
          <p className={styles.lead}>{DEEPCUTS_TEASER.lead}</p>
        </div>

        <Suspense fallback={<div className={styles.statsSkeleton} aria-hidden="true" />}>
          <StatBlock stats={stats} library={library} />
        </Suspense>
      </div>

      {/* ABOVE THE PACKS, WHICH IS WHERE THE EXPLANATION BELONGS ON THIS PARTICULAR
          page. Normally a legend goes under the thing it labels; here the thing it
          labels is a grid of sealed wrappers, and the single fact a visitor cannot
          guess - that the rarity runs backwards - has to arrive before they open one.
          Two stacked sections would have pushed the shelf off the first screen, so the
          two are tabs. */}
      <RulesTabs />

      <Suspense fallback={<ShelfSkeleton />}>
        <ShelfBlock library={library} />
      </Suspense>

      <p className={styles.footnote}>{DEEPCUTS_TEASER.footnote}</p>
    </div>
  );
};

export default DeepcutsPage;
