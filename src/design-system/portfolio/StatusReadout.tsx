import { DecryptAlphabet } from "@/models";
import { STATUS } from "@/data/site";
import { DecryptedText } from "../core/DecryptedText";
import { DefinitionList } from "../core/DefinitionList";
import { LocalClock } from "./LocalClock";

/**
 * The status cell of the instrument strip. Replaces StatusTicker.
 *
 * What was there was a second copy of the footer's gag marquee, scrolling under a
 * label that said "status" — a joke about status rather than a status. Four rows of
 * plain readout answer the question the label promises: what time it is where the work
 * happens, which zone that is, whether he is working, and where from. The jokes are
 * not lost; they never left the footer, which is where they were already running.
 *
 * A DefinitionList and not a bespoke grid, because term/value is exactly what these
 * are and the pairing is the meaning — a screen reader should say "employment,
 * employed still curious", not read two loose fragments. It also puts this cell on the
 * same rails as the listening statistics two cells over, which is what makes the strip
 * read as one instrument rather than four unrelated widgets.
 *
 * A server component with one client child. Only the clock has to run in the browser,
 * so only the clock ships as a client component; see LocalClock.tsx for why it starts
 * blank rather than being rendered on the server.
 */
export const StatusReadout = () => (
  <DefinitionList
    className="jk-status"
    items={[
      /* The clock does not settle, and it is the only value on the rail that does not.
         DecryptedText restarts whenever its text changes, which is what makes the
         fetched listening values settle on arrival — and this string is new every
         second, so it would never finish. It is also the one fact here that is true
         right now rather than recalled, which is the better reason: you do not acquire
         a signal you are already receiving. */
      { term: "local", value: <LocalClock /> },
      // One row, not two: the abbreviation is what people recognise and the offset is
      // what they can actually do arithmetic with, and splitting them would spend a
      // whole row of a narrow cell on half a fact.
      {
        term: "zone",
        value: (
          <DecryptedText
            text={`${STATUS.zone_label} · ${STATUS.utc_offset}`}
            alphabet={DecryptAlphabet.Lower}
          />
        ),
      },
      {
        term: "employment",
        value: <DecryptedText text={STATUS.employment} alphabet={DecryptAlphabet.Lower} />,
      },
      {
        term: "location",
        value: <DecryptedText text={STATUS.location} alphabet={DecryptAlphabet.Lower} />,
      },
    ]}
  />
);
