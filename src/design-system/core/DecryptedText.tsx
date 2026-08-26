"use client";

import { useEffect, useRef, useState } from "react";
import { DECRYPT_CHARS } from "@/constants/ui";
import { DecryptAlphabet, DecryptMode } from "@/models";
import { cx } from "@/utils/cx";

/**
 * A readout that settles: the string arrives scrambled and resolves to its real text.
 *
 * Adapted from React Bits' DecryptedText (MIT + Commons Clause, © David Haz). Four
 * things changed on the way in, and each one is why this is a rewrite rather than the
 * pasted file:
 *
 *   1. NO MOTION DEPENDENCY. The original imports `motion/react` solely to render a
 *      <motion.span> carrying zero animation props. A plain span does the same job, so
 *      the package stays on four dependencies.
 *
 *   2. IT DOES NOT OWN AN OBSERVER. The original mounts an IntersectionObserver per
 *      instance. This one waits for the `is-in` class that core/Reveal.tsx already
 *      puts on everything it reveals — one observer for the page, which is the rule
 *      that file was written to enforce. `.jk-decrypt` is in its SELECTOR; that is the
 *      whole of the coupling.
 *
 *   3. IT HONOURS prefers-reduced-motion. The original has no bypass at all, and a
 *      scrambling readout is exactly the kind of thing the query exists for.
 *
 *   4. THE SCREEN READER GETS THE REAL TEXT. The original's visually-hidden copy holds
 *      `displayText` — the *scrambled* string — so assistive tech reads gibberish for
 *      the length of the animation. It holds `text` here.
 *
 * THE RESTING STATE IS PLAIN TEXT, WHICH IS LOAD-BEARING AND NOT AN OPTIMISATION.
 * Before the trigger and after the animation this renders one text node and nothing
 * else, so the server HTML is byte-identical to what the markup rendered before this
 * component existed. That matters most in .jk-hero__title, which paints a grain sheet
 * through `background-clip: text` and blends with `mix-blend-mode: multiply`: at rest
 * there are no extra elements in there to interact with either. The per-character
 * spans exist only while the string is actually moving.
 *
 * For the same reason the character spans carry no colour of their own unless a caller
 * asks. Inside the title they inherit `color: transparent` and the parent's clipped
 * background paints through them; give them a colour and the grain dies. See the long
 * note on .jk-hero__accent in styles/widgets/_hero.scss.
 */

/** The class core/Reveal.tsx looks for. Keep it in step with SELECTOR there. */
const HOOK = "jk-decrypt";

const IN = "is-in";

/* THE FRAME RATE AND THE DURATION ARE SEPARATE NUMBERS, WHICH IS THE WHOLE POINT.
 *
 * React Bits ties them together: its `speed` is milliseconds per tick and Sequential
 * advances one character per tick, so the run time is text.length * speed and the only
 * way to make a short string last longer is to slow the scramble until it visibly
 * steps. Six characters over 920ms that way is 153ms a frame, which at --text-5xl
 * reads as a stutter rather than as a readout working.
 *
 * So the scramble redraws at a constant FRAME_MS and the reveal is driven by elapsed
 * time against `duration`. Length and run time are independent: the name and the plate
 * spec settle at the same smoothness, whatever their length or however long they run. */
const FRAME_MS = 45;

const DEFAULT_DURATION_MS = 1700;

/** Idle and Done both render plain text; only Running splits into spans. */
enum Phase {
  Idle = "IDLE",
  Running = "RUNNING",
  Done = "DONE",
}

export type DecryptedTextProps = {
  text: string;
  /** Which pool to scramble from. Match it to the face the target is set in. */
  alphabet?: DecryptAlphabet;
  mode?: DecryptMode;
  /** Total run time in milliseconds. Independent of length — see FRAME_MS above. */
  duration?: number;
  /** Goes on the wrapper, in every phase. See the note above the return. */
  className?: string;
  /** Goes on the characters that have not resolved yet. Omit inside clipped text. */
  scrambledClassName?: string;
};

const pick = (pool: string) => pool.charAt(Math.floor(Math.random() * pool.length));

/**
 * Spaces are never scrambled. That is what keeps word boundaries and therefore line
 * breaks stable in a wrapping paragraph — the only reason the blurb is survivable.
 */
const scramble = (text: string, revealed: number, pool: string) =>
  text
    .split("")
    .map((char, index) => (index < revealed || char === " " ? char : pick(pool)))
    .join("");

export const DecryptedText = ({
  text,
  alphabet = DecryptAlphabet.Display,
  mode = DecryptMode.Sequential,
  duration = DEFAULT_DURATION_MS,
  className,
  scrambledClassName,
}: DecryptedTextProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<Phase>(Phase.Idle);
  const [display, setDisplay] = useState<string>(text);
  const [revealed, setRevealed] = useState<number>(0);

  // Arming. Reveal.tsx may have added `is-in` before this effect runs — it reveals
  // everything at once under reduced motion, and its failsafe can fire early — so the
  // class is checked once before the observer is attached rather than only watched for.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (el.classList.contains(IN)) {
      setPhase(Phase.Running);
      return;
    }

    const observer = new MutationObserver(() => {
      if (!el.classList.contains(IN)) return;
      observer.disconnect();
      setPhase(Phase.Running);
    });

    observer.observe(el, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  /* Running.
   *
   * A self-scheduling timeout rather than setInterval, for two reasons. The first is
   * that it keeps every setState inside a timer callback: painting the opening frame
   * from the effect body would be a synchronous setState in an effect, which cascades a
   * render and which react-hooks/set-state-in-effect rejects outright. Scheduling it at
   * 0 puts it on the next macrotask, which is the same thing to the eye.
   *
   * The second is drift. An interval queues its next tick regardless of how long the
   * last render took, so a throttled tab or a slow frame builds a backlog that fires
   * all at once on the way back; a chain cannot get ahead of itself.
   */
  useEffect(() => {
    if (phase !== Phase.Running) return;

    const pool = DECRYPT_CHARS[alphabet];
    const startedAt = performance.now();
    let id = 0;

    /* Progress comes from the clock, not from a frame count, so a dropped frame or a
       backgrounded tab costs smoothness rather than correctness: the run still ends
       when it said it would instead of stretching by however long the tab was away. */
    const step = () => {
      const progress = Math.min(1, (performance.now() - startedAt) / duration);

      if (progress >= 1) {
        setRevealed(text.length);
        setPhase(Phase.Done);
        return;
      }

      // Burst holds everything scrambled and resolves in one go at the end; Sequential
      // walks the boundary along the string. Same clock, same exit.
      const resolved =
        mode === DecryptMode.Sequential ? Math.floor(progress * text.length) : 0;

      setRevealed(resolved);
      setDisplay(scramble(text, resolved, pool));

      id = window.setTimeout(step, FRAME_MS);
    };

    id = window.setTimeout(step, 0);

    return () => window.clearTimeout(id);
  }, [phase, text, alphabet, mode, duration]);

  /* THE WRAPPER'S className IS THE SAME STRING IN EVERY PHASE, AND THAT IS THE WHOLE
     REASON THE TRIGGER SURVIVES.
   *
   * `is-in` arrives from outside React — Reveal.tsx sets it with classList.add on a
   * node React owns. React diffs the className prop against its own previous value, so
   * as long as that value does not change it never writes the attribute and the added
   * class stays. Varying it per phase, which is the obvious way to write this, makes
   * the first re-render blow the class away: the readout still runs, because it has
   * already latched, but the DOM stops saying it was revealed and any future rule in
   * _reveal.scss keyed on .is-in would silently miss these elements.
   *
   * So the phase changes the children and nothing else. */
  return (
    <span ref={ref} className={cx(HOOK, className)}>
      {phase === Phase.Running ? (
        <>
          <span className="jk-decrypt__sr">{text}</span>
          <span aria-hidden="true">
            {display.split("").map((char, index) => (
              <span key={index} className={index < revealed ? undefined : scrambledClassName}>
                {char}
              </span>
            ))}
          </span>
        </>
      ) : (
        text
      )}
    </span>
  );
};
