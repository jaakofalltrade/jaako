import type { Metadata } from "next";
import { Suspense } from "react";
import { routes } from "@/client/endpoints";
import { LAB_STATUS_BADGE } from "@/constants";
import { LAB_APP, SUGGEST_TEASER } from "@/data/lab";
import { AnnotationTone, LabAppId } from "@/models";
import type { PlaylistSnapshot } from "@/models";
import { Annotation } from "@/design-system/core/Annotation";
import { Badge } from "@/design-system/core/Badge";
import { DefinitionList } from "@/design-system/core/DefinitionList";
import { SectionHead } from "@/design-system/core/SectionHead";
import { Skeleton } from "@/design-system/core/Skeleton";
import { BackLink } from "@/design-system/portfolio/BackLink";
import { MastheadBar } from "@/design-system/portfolio/MastheadBar";
import { cookies } from "next/headers";
import { QUEUE_SHOWN, VISITOR_COOKIE } from "@/constants";
import { spotifyService } from "@/server/spotify";
import { parseVisitor } from "@/server/visitor";
import { suggestService } from "@/server/suggest";
import { PlaylistCard } from "./PlaylistCard";
import { SuggestBoard } from "./SuggestBoard";
import styles from "./suggest.module.scss";

const app = LAB_APP[LabAppId.Suggest];
const badge = LAB_STATUS_BADGE[app.status];

export const metadata: Metadata = {
  title: "song suggestions · lab · jaako andes",
  // Still says what is missing, because the playlist header is live and the adding is
  // not, and a search result promising something the page cannot do is worse than one
  // that is honest about the state.
  description: "Suggest a song you like and it goes onto a public playlist. Not open for adding yet.",
};

/*
 * READS A COOKIE AND LIVE DATA, SO IT CANNOT BE PRERENDERED. Without this the route
 * built as static and the playlist was whatever it had been at build time: correct on
 * the first deploy and frozen from then on, which is the kind of wrong that looks like
 * caching working.
 */
export const dynamic = "force-dynamic";

/**
 * The snapshot, promised rather than delivered.
 *
 * Both live blocks below need the same fetch and neither can start without it, so it is
 * begun once in the page and handed down unawaited. Awaiting it in the page instead is
 * what this file used to do, and it is what made the whole route wait: nothing could
 * render, skeletons included, until Spotify had answered.
 */
type LiveProps = {
  snapshot: Promise<PlaylistSnapshot | null>;
};

/*
 * ARRIVES, RATHER THAN APPEARS.
 *
 * Both live blocks wear .jk-arrived, which dissolves them in over --dur-slow where the
 * shapes were. components/_skeleton.scss carries the reasoning: it is a CSS animation
 * rather than the reveal system, so nothing has to observe the DOM for a node that
 * turned up late, and it does not travel, because the skeleton spent its whole life
 * holding this exact box.
 */

/**
 * The playlist header, once the snapshot lands.
 *
 * Async, and therefore a server component, which is what keeps the playlist id and the
 * Spotify token on this side of the boundary. The browser is handed six strings.
 */
const PlaylistBlock = async ({ snapshot }: LiveProps) => (
  <div className="jk-arrived">
    <PlaylistCard playlist={(await snapshot)?.summary ?? null} />
  </div>
);

/** Its shape while that is in flight. Mirrors .playlist: the cover, then the body. */
const PlaylistBlockSkeleton = () => (
  <div role="status" className={styles.cardSkeleton}>
    <span className="jk-sr-only">{SUGGEST_TEASER.loading_playlist}</span>
    <Skeleton className={styles.cardSkeletonCover} />
    <Skeleton lines={3} className={styles.cardSkeletonBody} />
  </div>
);

/**
 * The search field and the queue under it.
 *
 * Everything this needs comes out of the same snapshot, plus two reads that are cheap
 * and local: the names join, and the cookie. They sit in here rather than in the page
 * because a boundary is only worth having if the work is genuinely behind it.
 */
const QueueBlock = async ({ snapshot, canAdd }: LiveProps & { canAdd: boolean }) => {
  const value = await snapshot;

  /*
   * SLICED BEFORE THE JOIN AND BEFORE IT CROSSES TO THE BROWSER, which is two costs
   * rather than one. The snapshot walks every page of the playlist, because the runtime
   * sum and the duplicate set both need all of it, so this array can hold a couple of
   * thousand entries. Only QUEUE_SHOWN of them are ever rendered.
   *
   * Unsliced, a four-hundred-track playlist meant four hundred full track objects
   * serialised into the payload of every page load to paint twenty-four rows, and four
   * hundred uris bound into the name query to look up twenty-four names.
   */
  const shown = (value?.queue ?? []).slice(0, QUEUE_SHOWN);

  /*
   * The join that turns Spotify's rows into ours. One query for the whole page, and it
   * degrades on its own: a database that cannot be reached leaves every name null and
   * the list still renders, because the playlist is the source of truth and our rows
   * only annotate it.
   */
  const names = shown.length
    ? await suggestService
        .namesByUri({ uris: shown.map((entry) => entry.uri) })
        .catch((error) => {
          console.error("[suggest] names failed:", error);
          return {} as Record<string, string>;
        })
    : {};

  const queue = shown.map((entry) => ({
    ...entry,
    added_by: names[entry.uri] ?? null,
  }));

  /*
   * The name this visitor last signed with, so a returning one adds in a single click.
   * Read here rather than in the browser because the cookie is httpOnly, which is the
   * whole reason it was worth setting.
   */
  const visitor = parseVisitor((await cookies()).get(VISITOR_COOKIE)?.value);

  return (
    <div className="jk-arrived">
      <SuggestBoard
        initialQueue={queue}
        initialName={visitor?.name ?? ""}
        totalOnPlaylist={value?.summary.track_count ?? queue.length}
        canAdd={canAdd}
        playlistUrl={value?.summary.url ?? null}
      />
    </div>
  );
};

/**
 * THREE ROWS, AND THE NUMBER IS A FLOOR RATHER THAN A GUESS AT THE LIST.
 *
 * How long the real list is cannot be known here — that is the fetch this is standing in
 * for — so any count is wrong for some playlist. What is not arbitrary is which way to
 * be wrong. Overshoot and the page is taller while it waits than it will be afterwards,
 * so everything below the list, footnote included, jumps UP as the content lands, which
 * is the one direction that yanks what someone is already reading. Undershoot and the
 * page grows downward instead, which is what every page on the web does while it loads.
 *
 * Six was an overshoot against a playlist with one song on it. Three is about the least
 * that still reads as a list rather than as one stray bar.
 */
const QUEUE_SKELETON_ROWS = 3;

const QueueBlockSkeleton = () => (
  <div role="status" className={styles.boardSkeleton}>
    <span className="jk-sr-only">{SUGGEST_TEASER.loading_queue}</span>
    <Skeleton className={styles.boardSkeletonField} />
    <Skeleton className={styles.boardSkeletonTitle} />
    <Skeleton lines={QUEUE_SKELETON_ROWS} className={styles.boardSkeletonRows} />
  </div>
);

/**
 * Teaser for /lab/suggest. Nothing here is wired: the search field is disabled, the
 * button does nothing, and the playlist below it is three empty rows.
 *
 * This is the only app in the lab that keeps the site's own design, so it is also the
 * only teaser built almost entirely out of existing components. Its module holds
 * layout and the placeholder rows, and nothing else — if a rule in here starts
 * describing a colour or a type size, it belongs in globals.scss instead and this
 * page is drifting away from the design it is supposed to be sharing.
 *
 * The form is real markup rather than a picture of a form. A disabled Field and a
 * disabled Button are already the correct components in their correct state, and when
 * this app is built the work is removing `disabled` and adding a handler.
 *
 * ONE PART OF IT IS NOT A TEASER. The playlist header is live: name, cover, count and
 * total runtime read from Spotify on the server, linking out to the real thing. It is
 * here before anything else works because it is the only block on the page that can be
 * true yet, and because seeing what you would be adding to is most of the invitation.
 *
 * NOT ASYNC ANY MORE, AND THAT IS THE POINT. This route is force-dynamic, so it cannot
 * be prefetched; while the whole component awaited Spotify, a click on the lab index
 * sat there with the old page still on screen until the fetch came back. Everything
 * that does not depend on the network — masthead, back link, head, badge, pitch, spec,
 * footnote — is rendered and sent immediately now, and the two blocks that do wait
 * behind their own boundaries with a shape where they are going to land.
 */
const SuggestTeaserPage = () => {
  /* Started here and awaited nowhere: one fetch, shared by both blocks above. Two calls
     would be two Spotify round trips on a cold cache — suggestPlaylist.ts caches the
     result, but it has nothing to dedupe two requests already in flight. */
  const snapshot = spotifyService.playlist.snapshot();

  /* Synchronous: it reads configuration, not the network. So the head can say whether
     adding is open without waiting for anything. */
  const canAdd = suggestService.isConfigured();

  return (
    <section className="jk-section">
      <MastheadBar />

      <BackLink href={routes.lab.index}>back to the lab</BackLink>

      {/* The note said adding was off while the add button worked. It follows the
          same flag the board does now. */}
      <SectionHead
        index={app.index}
        note={canAdd ? SUGGEST_TEASER.open_note : SUGGEST_TEASER.note}
        noteIsInformational
      >
        {SUGGEST_TEASER.title}
      </SectionHead>

      <div className={styles.status}>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>

      {/* THE THING AND ITS SPECIFICATION, side by side, which is the arrangement the
          rest of the site already uses: a plate with its readout, a role with its
          dates. The spec has been beside the search field and beside the lead on the
          way here, and both were wrong for the same reason - it was describing the
          playlist, and it belongs against the playlist. */}
      <div className={styles.intro}>
        {/* The card and the pitch are one column, so the sentence sits directly under
            the thing it is talking about rather than under the whole grid. The spec
            keeps the second column beside both. */}
        <div className={styles.introMain}>
          <Suspense fallback={<PlaylistBlockSkeleton />}>
            <PlaylistBlock snapshot={snapshot} />
          </Suspense>

          <p className={styles.lead} data-reveal>
            {SUGGEST_TEASER.lead}
          </p>
        </div>

        {/* Unruled. A stroke under every pair was doing the same job the grid gap
            already does, which is the same edit sections/_about.scss records making
            to the about block's own metadata. */}
        <DefinitionList items={SUGGEST_TEASER.spec} className={styles.spec} />
      </div>

      <Suspense fallback={<QueueBlockSkeleton />}>
        <QueueBlock snapshot={snapshot} canAdd={canAdd} />
      </Suspense>

      <Annotation tone={AnnotationTone.Info} className={styles.footnote}>
        {SUGGEST_TEASER.footnote}
      </Annotation>
    </section>
  );
};

export default SuggestTeaserPage;
