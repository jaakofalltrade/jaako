"use client";

import React from "react";
import { suggestApi } from "@/client/suggestApi";
import { MIN_QUERY_LENGTH, QUEUE_SHOWN, SEARCH_DEBOUNCE_MS, SUGGEST_MESSAGE } from "@/constants";
import { RowState } from "@/models";
import type { QueueEntry, SearchResult } from "@/models";
import { SUGGEST_TEASER } from "@/data/lab";
import { getIsoDateTimeUtc } from "@/oras";
import { getEpochMilliseconds } from "@/oras/milliseconds";
import { checkDisplayName, normalizeDisplayName } from "@/utils/nameRules";
import { QueueHead } from "./QueueHead";
import { QueueRow } from "./QueueRow";
import { SearchRow } from "./SearchRow";
import styles from "./suggest.module.scss";

export type SuggestBoardProps = {
  /** Rendered on the server, so the list is in the HTML before any script runs. */
  initialQueue: QueueEntry[];
  /** The name this visitor last signed with, from the cookie. Empty for a new one. */
  initialName: string;
  /** Every track on the playlist, not just the rendered few. Drives "and N more". */
  totalOnPlaylist: number;
  /** False when the write token or the database is missing. Search still works. */
  canAdd: boolean;
  /** Where "and N more" points. Null when the playlist could not be read. */
  playlistUrl: string | null;
};

/**
 * The interactive half of /lab/suggest.
 *
 * One client island holding all the state, mounted under a server-rendered header and
 * a server-rendered list. The page is useful with JavaScript switched off: the
 * playlist is already there to read.
 *
 * THE LIST IS UPDATED OPTIMISTICALLY, WHICH IS A CLAIM WITH A DEADLINE. An add
 * prepends its row immediately and the server's answer either confirms it or does not.
 * That is worth roughly 300ms of a row that might not be real, and RowState.Failed is
 * what stops the claim ever quietly becoming a lie.
 */

/** A local key, because two optimistic rows for the same track would collide on uri. */
type Row = QueueEntry & { key: string; state: RowState; error?: string };

const settled = (entry: QueueEntry): Row => ({
  ...entry,
  /* added_at can be null now — Spotify does not always say when a track was added —
     so the uri carries the key alone in that case. Two dateless rows for the same
     track cannot both be on the playlist, so it is still unique where it matters. */
  key: `${entry.uri}:${entry.added_at ?? ""}`,
  state: RowState.Settled,
});

/**
 * The row shown while the server has not answered yet.
 *
 * At module scope rather than inside the component, and not only to satisfy
 * react-hooks/purity: reading the clock is the one thing here that gives a different
 * answer each call, and keeping it out of the component body is what lets everything
 * in there be read as a pure function of its state.
 *
 * The key is timestamped because the uri is not unique enough. A track that failed and
 * is being retried would otherwise collide with the row it is replacing.
 */
const optimistic = (args: { track: SearchResult; signedAs: string }): Row => ({
  ...args.track,
  added_at: getIsoDateTimeUtc.now(),
  added_by: args.signedAs,
  key: `pending:${args.track.uri}:${getEpochMilliseconds.now()}`,
  state: RowState.Adding,
});

export const SuggestBoard = ({
  initialQueue,
  initialName,
  totalOnPlaylist,
  canAdd,
  playlistUrl,
}: SuggestBoardProps) => {
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>(() => initialQueue.map(settled));

  /*
   * THE RESULTS ARE STORED WITH THE QUERY THEY ANSWER, WHICH IS WHAT MAKES THE REST OF
   * THIS DERIVED RATHER THAN SET. Keeping "searching" as its own flag meant writing it
   * from inside the effect, and an effect that sets state on the way in is a render
   * that has to happen twice. Holding the pair lets both fall out of a comparison:
   * results belong to the field only while the query matches, and anything else is
   * still in flight.
   */
  const [found, setFound] = React.useState<{ q: string; results: SearchResult[] }>({
    q: "",
    results: [],
  });

  /** Which result has its name slab open, or null once the name is known. */
  const [asking, setAsking] = React.useState<string | null>(null);
  const [name, setName] = React.useState(initialName);
  const [nameError, setNameError] = React.useState<string | null>(null);

  /*
   * The tracks with a POST in flight. Without it the add control stayed live while its
   * own request was running, so a double-click sent two: both read the playlist before
   * either add landed, both passed the duplicate check, and the track went on twice
   * while spending two of the visitor's three adds.
   *
   * This closes the double-click, which is the case that actually happens. It does not
   * make the duplicate check atomic - two different people adding the same track in the
   * same second still race, because the check reads Spotify and the write is a separate
   * call. That residual is accepted: the outcome is one duplicate on a playlist, and
   * the owner can remove it.
   */
  const [pending, setPending] = React.useState<Set<string>>(() => new Set());

  /* Grows with each confirmed add, so "and N more" stays right without a refetch. */
  const [total, setTotal] = React.useState(totalOnPlaylist);

  const known = normalizeDisplayName(name);
  const hasName = !checkDisplayName(known);

  const wanted = query.trim();
  const active = wanted.length >= MIN_QUERY_LENGTH;

  /** Only ever the results for what is in the field right now. */
  const results = active && found.q === wanted ? found.results : [];
  const searching = active && found.q !== wanted;

  /*
   * ONE IN-FLIGHT SEARCH AT A TIME, AND THE ABORT IS THE LOAD-BEARING HALF. Without it
   * a slow response for "rad" can land after a fast one for "radiohead" and repaint the
   * list with results for a query the field no longer holds. The debounce only reduces
   * how often that race is run.
   */
  React.useEffect(() => {
    // Nothing to look for, and nothing to clear: what renders is derived above, so a
    // query that falls below the floor shows no results without any state being set.
    if (!active) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      const response = await suggestApi.search({ q: wanted, signal: controller.signal });
      // Checked after the await as well as by the cleanup, because an abort that lands
      // mid-flight would otherwise repaint the list for a query already replaced.
      if (controller.signal.aborted) return;
      setFound({ q: wanted, results: response.results });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [wanted, active]);

  const submit = async (args: { track: SearchResult; signedAs: string }) => {
    const { track, signedAs } = args;

    if (pending.has(track.uri)) return;

    const row = optimistic({ track, signedAs });

    setPending((current) => new Set(current).add(track.uri));
    setRows((current) => [row, ...current]);
    setAsking(null);

    const response = await suggestApi.add({ request: { track_uri: track.uri, name: signedAs } });

    setPending((current) => {
      const next = new Set(current);
      next.delete(track.uri);
      return next;
    });

    if (response.added) setTotal((current) => current + 1);

    setRows((current) =>
      current.map((other) => {
        if (other.key !== row.key) return other;
        return response.added && response.entry
          ? settled(response.entry)
          : { ...other, state: RowState.Failed, error: response.error };
      })
    );
  };

  /** Clicking add: straight through when the name is known, via the slab when not. */
  const add = (args: { track: SearchResult }) => {
    if (!hasName) {
      setAsking(args.track.uri);
      return;
    }
    void submit({ track: args.track, signedAs: known });
  };

  const confirmName = (args: { track: SearchResult }) => {
    const failure = checkDisplayName(normalizeDisplayName(name));
    if (failure) {
      /* SUGGEST_MESSAGE, not a ternary. checkDisplayName has three outcomes and the
         two-way version answered NameRequired with "10 characters at most", which is
         the opposite of the problem. The table already covers every case, and it is
         the same sentence the route would send for the same failure. */
      setNameError(SUGGEST_MESSAGE[failure]);
      return;
    }

    setNameError(null);
    void submit({ track: args.track, signedAs: normalizeDisplayName(name) });
  };

  /*
   * Newest first, because tracks go in at position 0. Appending would make this the
   * OLDEST two dozen, which is the wrong end of the list to show.
   */
  const shown = rows.slice(0, QUEUE_SHOWN);
  const hidden = Math.max(0, total - shown.length);

  const retry = (row: Row) => {
    setRows((current) => current.filter((other) => other.key !== row.key));
    void submit({ track: row, signedAs: row.added_by ?? known });
  };

  return (
    <>
      <div className={styles.search}>
        <label className={styles.searchField}>
          <span className={styles.searchLabel}>{SUGGEST_TEASER.search_label}</span>
          {/* A bare input rather than the design system's Input, and this is the one
              place on the page that departs from it. .jk-input is a FORM control: a
              bordered box on a filled surface, which is right in the contact form and
              wrong here, where the page is hairlines and open ground and this is the
              only box on it. Restyling the global class from a module is what
              docs/lab.md rules out, so the field is local instead. */}
          <input
            className={styles.searchInput}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={SUGGEST_TEASER.search_placeholder}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        {canAdd ? null : <p className={styles.searchNote}>{SUGGEST_TEASER.closed_hint}</p>}

            {/* The line that makes a returning visitor's add one click, and their way
              back to the field.

              HIDDEN WHILE A SLAB IS OPEN, and that is not tidiness. The slab asks for
              the name; this reports it. Both at once showed the same name twice, and
              worse, this line APPEARING as the name became valid pushed the slab's own
              button down by its height, so a click aimed at the button landed under it.

              "change" clears the name rather than opening a slab of its own. There is
              no row to attach one to at this point, and the next add opens the slab
              under the row it belongs to, which is where the question makes sense. */}
          {hasName && asking === null ? (
            <p className={styles.signedAs}>
              adding as {known}
              <button
                type="button"
                className={styles.change}
                onClick={() => {
                  setName("");
                  setNameError(null);
                }}
              >
                change
              </button>
            </p>
          ) : null}

          {results.length ? (
            <ul className={styles.results}>
              {results.map((track) => (
                <SearchRow
                  key={track.uri}
                  track={track}
                  disabled={!canAdd || pending.has(track.uri)}
                  asking={asking === track.uri}
                  name={name}
                  error={nameError}
                  onAdd={() => add({ track })}
                  onNameChange={(value) => {
                setName(value);
                setNameError(null);
              }}
                  onConfirm={() => confirmName({ track })}
                  onCancel={() => setAsking(null)}
                />
              ))}
            </ul>
          ) : null}

        {searching && !results.length ? (
          <p className={styles.searchNote}>{SUGGEST_TEASER.searching}</p>
        ) : null}
      </div>

      <div className={styles.queue}>
        <h3 className={styles.queueTitle}>{SUGGEST_TEASER.queue_label}</h3>

        {rows.length ? (
          <ul className={styles.rows}>
            <QueueHead />

            {shown.map((row, index) => (
              <QueueRow
                key={row.key}
                entry={row}
                state={row.state}
                error={row.error}
                index={String(index + 1).padStart(2, "0")}
                onRetry={() => retry(row)}
              />
            ))}
          </ul>
        ) : (
          <p className={styles.queueNote}>{SUGGEST_TEASER.queue_empty}</p>
        )}

        {/* The playlist is unbounded by design, so the page shows the newest handful
            and sends the rest where the whole thing already lives. */}
        {hidden > 0 && playlistUrl ? (
          <a className={styles.more} href={playlistUrl} target="_blank" rel="noopener noreferrer">
            and {hidden} more on spotify &rarr;
          </a>
        ) : null}
      </div>

    </>
  );
};
