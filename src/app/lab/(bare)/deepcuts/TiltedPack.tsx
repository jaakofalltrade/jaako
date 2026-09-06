"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import type { SpringOptions } from "motion/react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import styles from "./deepcuts.module.scss";

export type TiltedPackProps = {
  children: ReactNode;
  /** Extra class on the tilting element, so the pack keeps its own look. */
  className?: string;
  /** Passed through to the tilting element, which is where data-plain has to land. */
  plain?: boolean;
};

/**
 * The opened pack, tilting toward the pointer.
 *
 * ADAPTED FROM react-bits' TiltedCard (reactbits.dev/components/tilted-card), and
 * adapted rather than copied for one reason: that component is built around an
 * `imageSrc` and renders an <img> with an optional overlay. A pack here is not an image.
 * It is a composed object - serrated edge, crimp band, tear strip, printed cover, name,
 * count - and swapping it for a flat picture to use the component as published would
 * throw away everything that makes it read as a wrapper.
 *
 * So what is taken is the MECHANIC, which is the part worth having: pointer position
 * mapped to a rotation about both axes, each on a spring, plus a scale on hover. The
 * spring constants are theirs unchanged, because they are tuned and there is no reason
 * to re-guess them.
 *
 * WHAT WAS LEFT BEHIND, deliberately:
 *
 *   the mobile warning   The original renders "This effect is not optimized for mobile"
 *                        across the card under 640px. A visitor is not the audience for
 *                        a note about the implementation. Touch simply gets no tilt,
 *                        because there is no pointer to track.
 *   the tooltip caption  A floating label following the cursor. The pack already carries
 *                        its name; a second one chasing the mouse is noise.
 *   the fixed sizes      Theirs takes explicit width and height. This wraps whatever it
 *                        is given, so the pack keeps the aspect ratio the shelf uses.
 *
 * NO TILT UNDER prefers-reduced-motion. A card that leans as the pointer crosses it is
 * exactly the kind of movement that setting is asking to be spared, and the handlers are
 * not attached at all rather than being attached and neutered.
 */

/** react-bits' own values, unchanged: slow and heavy, which is what stops it feeling twitchy. */
const SPRING: SpringOptions = {
  damping: 30,
  stiffness: 100,
  mass: 2,
};

/** Degrees at the edge of the card. Their default; enough to read as a lean, not a flip. */
const ROTATE_AMPLITUDE = 12;
const SCALE_ON_HOVER = 1.04;

export const TiltedPack = ({ children, className, plain }: TiltedPackProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();

  const rotateX = useSpring(useMotionValue(0), SPRING);
  const rotateY = useSpring(useMotionValue(0), SPRING);
  const scale = useSpring(1, SPRING);

  const onMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    /* Offset from the CENTRE, so the sign of the rotation follows which half of the card
       the pointer is over and the middle sits flat. */
    const offsetX = event.clientX - rect.left - rect.width / 2;
    const offsetY = event.clientY - rect.top - rect.height / 2;

    // Negated on X: pushing the pointer down should tip the far edge away, not toward.
    rotateX.set((offsetY / (rect.height / 2)) * -ROTATE_AMPLITUDE);
    rotateY.set((offsetX / (rect.width / 2)) * ROTATE_AMPLITUDE);
  };

  const rest = () => {
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
  };

  /* Not wrapped at all when motion is unwanted: no perspective, no handlers, no springs
     driving a transform that never moves. */
  if (still) {
    return (
      <div className={className} data-plain={plain ? "" : undefined}>
        {children}
      </div>
    );
  }

  return (
    /* The perspective lives on the parent, which is what makes the rotation read as
       depth rather than as a skew. */
    <div
      className={styles.tiltStage}
      onMouseMove={onMouseMove}
      onMouseEnter={() => scale.set(SCALE_ON_HOVER)}
      onMouseLeave={rest}
    >
      <motion.div
        ref={ref}
        className={className}
        data-plain={plain ? "" : undefined}
        style={{ rotateX, rotateY, scale, transformStyle: "preserve-3d" }}
      >
        {children}
      </motion.div>
    </div>
  );
};
