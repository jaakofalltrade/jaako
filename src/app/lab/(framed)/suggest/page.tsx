import type { Metadata } from "next";
import { routes } from "@/client/endpoints";
import { LAB_STATUS_BADGE } from "@/constants";
import { LAB_APP, SUGGEST_TEASER } from "@/data/lab";
import { AnnotationTone, LabAppId } from "@/models";
import { Annotation } from "@/design-system/core/Annotation";
import { Badge } from "@/design-system/core/Badge";
import { DefinitionList } from "@/design-system/core/DefinitionList";
import { SectionHead } from "@/design-system/core/SectionHead";
import { BackLink } from "@/design-system/portfolio/BackLink";
import { MastheadBar } from "@/design-system/portfolio/MastheadBar";
import { cookies } from "next/headers";
import { QUEUE_SHOWN, VISITOR_COOKIE } from "@/constants";
import { playlistService } from "@/server/spotify";
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
 * Async, and therefore a server component, which is what keeps the playlist id and the
 * Spotify token on this side of the boundary. The browser is handed six strings.
 */
/*
 * READS A COOKIE AND LIVE DATA, SO IT CANNOT BE PRERENDERED. Without this the route
 * built as static and the playlist was whatever it had been at build time: correct on
 * the first deploy and frozen from then on, which is the kind of wrong that looks like
 * caching working.
 */
export const dynamic = "force-dynamic";

const SuggestTeaserPage = async () => {
  const snapshot = await playlistService.snapshot();

  /*
   * The join that turns Spotify's rows into ours. One query for the whole page, and it
   * degrades on its own: a database that cannot be reached leaves every name null and
   * the list still renders, because the playlist is the source of truth and our rows
   * only annotate it.
   */
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
  const shown = (snapshot?.queue ?? []).slice(0, QUEUE_SHOWN);

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

  const canAdd = suggestService.isConfigured();

  /*
   * The name this visitor last signed with, so a returning one adds in a single click.
   * Read here rather than in the browser because the cookie is httpOnly, which is the
   * whole reason it was worth setting.
   */
  const visitor = parseVisitor((await cookies()).get(VISITOR_COOKIE)?.value);

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
          <PlaylistCard playlist={snapshot?.summary ?? null} />

          <p className={styles.lead} data-reveal>
            {SUGGEST_TEASER.lead}
          </p>
        </div>

        {/* Unruled. A stroke under every pair was doing the same job the grid gap
            already does, which is the same edit sections/_about.scss records making
            to the about block's own metadata. */}
        <DefinitionList items={SUGGEST_TEASER.spec} className={styles.spec} />
      </div>

      <SuggestBoard
        initialQueue={queue}
        initialName={visitor?.name ?? ""}
        totalOnPlaylist={snapshot?.summary.track_count ?? queue.length}
        canAdd={canAdd}
        playlistUrl={snapshot?.summary.url ?? null}
      />

      <Annotation tone={AnnotationTone.Info} className={styles.footnote}>
        {SUGGEST_TEASER.footnote}
      </Annotation>
    </section>
  );
};

export default SuggestTeaserPage;
