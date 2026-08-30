import type { Metadata } from "next";
import { routes } from "@/client/endpoints";
import { LAB_STATUS_BADGE } from "@/constants";
import { LAB_APP, SUGGEST_TEASER } from "@/data/lab";
import { AnnotationTone, ButtonVariant, LabAppId } from "@/models";
import { Annotation } from "@/design-system/core/Annotation";
import { Badge } from "@/design-system/core/Badge";
import { Button } from "@/design-system/core/Button";
import { DefinitionList } from "@/design-system/core/DefinitionList";
import { SectionHead } from "@/design-system/core/SectionHead";
import { Field } from "@/design-system/forms/Field";
import { Input } from "@/design-system/forms/Input";
import { BackLink } from "@/design-system/portfolio/BackLink";
import { MastheadBar } from "@/design-system/portfolio/MastheadBar";
import { playlistService } from "@/server/spotify";
import { PlaylistCard } from "./PlaylistCard";
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
const SuggestTeaserPage = async () => {
  const playlist = await playlistService.summary();

  return (
    <section className="jk-section">
      <MastheadBar />

      <BackLink href={routes.lab.index}>back to the lab</BackLink>

      <SectionHead index={app.index} note={SUGGEST_TEASER.note} noteIsInformational>
        {SUGGEST_TEASER.title}
      </SectionHead>

      <div className={styles.status}>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>

      <PlaylistCard playlist={playlist} />

      <p className={styles.lead} data-reveal>
        {SUGGEST_TEASER.lead}
      </p>

      <div className={styles.grid}>
        {/* Not a <form>. There is nothing to submit to, and a form element here would
            be one Enter keypress away from a page reload that looks like a bug. */}
        <div className={styles.form}>
          <Field label={SUGGEST_TEASER.search_label} hint={SUGGEST_TEASER.search_hint}>
            <Input placeholder={SUGGEST_TEASER.search_placeholder} disabled />
          </Field>

          <Button variant={ButtonVariant.Primary} disabled>
            {SUGGEST_TEASER.submit_label}
          </Button>
        </div>

        <DefinitionList items={SUGGEST_TEASER.spec} ruled className={styles.spec} />
      </div>

      <div className={styles.queue}>
        <h3 className={styles.queueTitle}>{SUGGEST_TEASER.queue_label}</h3>
        <p className={styles.queueNote}>{SUGGEST_TEASER.queue_note}</p>

        {/* Three blank rows rather than three invented songs. A placeholder that looks
            like real data is a promise about what will be there, and this one would be
            a claim that people have already added something. */}
        <ul className={styles.rows} aria-hidden="true">
          <li className={styles.row} />
          <li className={styles.row} />
          <li className={styles.row} />
        </ul>
      </div>

      <Annotation tone={AnnotationTone.Info} className={styles.footnote}>
        {SUGGEST_TEASER.footnote}
      </Annotation>
    </section>
  );
};

export default SuggestTeaserPage;
