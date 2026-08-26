import { DecryptAlphabet } from "@/models";
import { Annotation } from "../core/Annotation";
import { DecryptedText } from "../core/DecryptedText";
import { KnownAs } from "./KnownAs";
import { ListeningStats } from "./ListeningStats";
import { StatusReadout } from "./StatusReadout";
import { VisitorIndex } from "./VisitorIndex";

type Cell = {
  label: string;
  content: React.ReactNode;
};

/**
 * Four readouts in a row, directly under the hero.
 *
 * This is where the site's comic layer lives now. Scattered across the old design as a
 * guestbook panel, a footer counter and a marquee, the same four gags read as clutter;
 * collected into one dense instrument rail they read as a specification — which is
 * both funnier and the only way they survive an immaculate visual direction.
 *
 * It also lands exactly where a generic portfolio would put a row of client logos.
 */
const CELLS: Cell[] = [
  { label: "visitor index", content: <VisitorIndex /> },
  { label: "known as", content: <KnownAs /> },
  // Was a scrolling marquee of the footer's gag lines. It is a real readout now —
  // clock, zone, employment, location — because that is what the label promises. See
  // StatusReadout.tsx.
  { label: "status", content: <StatusReadout /> },
  { label: "listening · 4 weeks", content: <ListeningStats /> },
];

export const InstrumentStrip = () => (
  <div className="jk-strip">
    {CELLS.map((cell) => (
      <section key={cell.label} className="jk-strip__cell">
        {/* Info, not Decorative, and the tone had to move with the weight rather than
            after it. Decorative is --text-faint, which fails AA, and the Annotation
            component aria-hides it precisely because of that — a fair contract while
            these were the quietest thing in the cell. They are the loudest now: each
            one names what the readout under it is, and a bold heading that no screen
            reader announces is the worst of both. Info puts them in the accessibility
            tree at --text-dim, which is what they were always doing visually. */}
        {/* The labels, and then the readouts under them — each cell wires its own; see
            VisitorIndex, KnownAs, StatusReadout and ListeningStats.

            ONE VALUE ON THE RAIL IS LEFT ALONE, AND IT IS A HARD CONSTRAINT RATHER THAN
            A PREFERENCE. The clock in the status cell renders a new string every second,
            and DecryptedText restarts when its text changes — that is what makes the
            fetched listening values settle when they arrive instead of popping in. Point
            it at a per-second value and the two features multiply: it would scramble,
            settle, and be handed a new string before it finished, forever. The clock is
            the one thing here that is already true; it does not need to be acquired.

            Everything shares the default duration and the whole rail is in view at once,
            so it resolves together and reads as one instrument rather than nine. */}
        <Annotation className="jk-strip__label">
          <DecryptedText text={cell.label} alphabet={DecryptAlphabet.Upper} />
        </Annotation>
        {cell.content}
      </section>
    ))}
  </div>
);
