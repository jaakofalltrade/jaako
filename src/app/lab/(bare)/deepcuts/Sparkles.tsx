"use client";

import { motion } from "motion/react";
import styles from "./deepcuts.module.scss";

/**
 * The burst that comes off a pack as it opens.
 *
 * IT IS NOT A GLOW, AND ON THIS PAGE THAT DISTINCTION IS ENFORCED. The rule at the top of
 * deepcuts.module.scss bans light thrown off a surface, and only /lab/slots is exempt.
 * These are SHAPES: little four-pointed stars, clipped, filled with a gradient inside
 * their own bounds, flying outward. Nothing is blurred, nothing bleeds past an edge, and
 * removing them changes no other element's appearance. A radial haze behind the cards
 * would have been the easy version and would have broken the rule.
 *
 * FIXED ANGLES RATHER THAN Math.random(). Every value below is derived from the index, so
 * the burst is identical on every rip. That is not fussiness: this renders inside a
 * dialog that opens and closes, and a random layout would reshuffle on any re-render for
 * no reason a viewer could connect to anything they did. A burst that looks scattered is
 * the goal; a burst that IS random is not needed to get there.
 *
 * The golden angle is what does the scattering. Stepping by 137.5 degrees never repeats a
 * direction over a small count and never lines two up, which is the same reason seeds
 * spiral the way they do - and it beats evenly spaced spokes, which read as a wheel.
 *
 * WHOEVER ASKED FOR NO MOTION SEES NOTHING. This is decoration with no content in it, so
 * the caller simply does not mount it; there is no reduced-motion variant to design
 * because a still sparkle is a dot.
 */

/** Never repeats a direction, never makes a wheel. See above. */
const GOLDEN_ANGLE = 137.5;

export type SparklesProps = {
  /** How many. Twenty is a burst; this many is a burst you cannot miss. */
  count?: number;
  /** How long one lives, in milliseconds. */
  lifetime?: number;
  /** How far the near and far rings travel, in pixels. */
  travel?: { near: number; far: number };
  /** Pixel size of the near and far sparkles. Near is the bigger of the two. */
  size?: { near: number; far: number };
};

/**
 * The numbers live here rather than in src/constants, because nothing outside this
 * component has an opinion about them: a count and four lengths are how this burst is
 * drawn, not facts about the app. They are props with defaults so a caller that wants a
 * smaller burst can ask for one without a second component.
 */
export const Sparkles = ({
  count = 32,
  lifetime = 1100,
  travel = { near: 200, far: 340 },
  size = { near: 26, far: 14 },
}: SparklesProps) => (
  <div className={styles.sparkles} aria-hidden="true">
    {Array.from({ length: count }, (_, index) => {
      const angle = (index * GOLDEN_ANGLE * Math.PI) / 180;
      /* Two rings rather than one circle: a single radius reads as an expanding hoop.
         The odd ones travel further, and the size runs the other way, so the near
         sparkles are the big ones and the far ones are specks. */
      const distance = index % 2 ? travel.far : travel.near;
      const width = index % 2 ? size.far : size.near;

      return (
        <motion.span
          key={index}
          className={styles.sparkle}
          style={{ width, height: width }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
          animate={{
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            /* Out and gone. The keyframes are what make it a POP rather than a fade:
               full size a fifth of the way through, then shrinking as it travels, which
               is what a thrown spark does. */
            scale: [0, 1, 0.35],
            opacity: [0, 1, 0],
            rotate: index % 2 ? 140 : -110,
          }}
          transition={{
            duration: lifetime / 1000,
            /* Staggered by a hair, so the burst has an edge to it rather than every
               sparkle leaving on the same frame. */
            delay: (index % 5) * 0.035,
            ease: "easeOut",
            times: [0, 0.2, 1],
          }}
        />
      );
    })}
  </div>
);
