import { Annotation } from "../core/Annotation";
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
        <Annotation className="jk-strip__label">{cell.label}</Annotation>
        {cell.content}
      </section>
    ))}
  </div>
);
