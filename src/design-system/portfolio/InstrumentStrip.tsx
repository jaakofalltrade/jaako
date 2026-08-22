import { AnnotationTone } from "@/models";
import { Annotation } from "../core/Annotation";
import { ListeningStats } from "./ListeningStats";
import { SignatureLog } from "./SignatureLog";
import { StatusTicker } from "./StatusTicker";
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
  { label: "signature log", content: <SignatureLog /> },
  { label: "status", content: <StatusTicker /> },
  { label: "listening · 4 weeks", content: <ListeningStats /> },
];

export const InstrumentStrip = () => (
  <div className="jk-strip">
    {CELLS.map((cell) => (
      <section key={cell.label} className="jk-strip__cell">
        <Annotation tone={AnnotationTone.Decorative} className="jk-strip__label">
          {cell.label}
        </Annotation>
        {cell.content}
      </section>
    ))}
  </div>
);
