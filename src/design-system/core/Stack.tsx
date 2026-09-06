"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import type { PanInfo } from "motion/react";

export type StackItem = {
  /** Stable across a throw, because the order is state and React keys it by this. */
  id: string;
  node: ReactNode;
};

export type StackProps = {
  items: StackItem[];
  /**
   * Fires when the front item is thrown, AFTER it has gone to the back.
   *
   * The order is this component's own state, so a caller does not have to reorder
   * anything - this exists so a caller can react to the change, which usually means
   * following the front item with something outside the pile.
   */
  onThrow?: (id: string) => void;
  /**
   * SHIPS NO STYLING, like Pagination and Tabs. Every class comes from the caller: this
   * owns the drag, the fan and the order, and has no opinion about what a card looks
   * like. A shared component that reached for one app's stylesheet would drag that app's
   * cascade into every page that used it.
   */
  classNames?: {
    list?: string;
    slot?: string;
    /* Reduced motion lays the pile out flat, and a flat list is a different box from a
       stacked one - so it gets its own two classes rather than reusing one for both the
       list and its items, which silently gave the <ul> and the <li> the same rules. */
    stillList?: string;
    stillSlot?: string;
  };
  /** Named for assistive technology, since a pile of draggable things is not self-describing. */
  label?: string;
};

/**
 * A pile of anything, where a drag throws the front one to the back.
 *
 * ADAPTED FROM react-bits' Stack (reactbits.dev/components/stack). The mechanic is
 * theirs: a pile, each item draggable, and a drag past a threshold sends the front one
 * behind. So are the spring constants and the fan of rotations.
 *
 * WHAT WAS CHANGED, AND WHY EACH:
 *
 *   the items    Theirs takes an array of ReactNodes and falls back to four Unsplash
 *                photographs. This takes an id with each node, because the order is
 *                state and keying a reorderable list by index makes React reuse the
 *                wrong element the moment anything moves.
 *   the styling  Theirs sets its own sizes and shadows. This sets none: it is a design
 *                system component and the caller owns the look.
 *   the drag     Theirs rotates on both axes from the drag offset, which reads as an
 *                item being wobbled. A card is thrown off a pile sideways, so this keeps
 *                the tilt but drives it mostly off the horizontal.
 *   mobile       Theirs measures window.innerWidth in an effect to decide whether to
 *                disable dragging. Dragging works fine with a finger; what does not is
 *                the hover, and that needs no measurement.
 *   autoplay     Dropped. A pile that shuffles itself while you are reading it is taking
 *                the content away.
 *
 * REDUCED MOTION GETS A LIST, NOT A PILE. A stack you have to drag is motion as the only
 * way through the content, which is exactly what that setting asks to be spared, so the
 * items lay out flat and all of them are readable at once.
 *
 * IT IS NOT KEYBOARD OPERABLE, and that is a real gap rather than an omission nobody
 * noticed. Throwing is a drag and there is no key that does it. Anything whose content
 * must be reachable without a pointer should not be the only place that content lives.
 */

/** react-bits' own spring for the pile. */
const SPRING = { type: "spring" as const, stiffness: 260, damping: 20 };

/** How far an item has to be thrown before it goes to the back. Theirs. */
const SENSITIVITY = 140;

/** The fan. Fixed per position rather than random, so a pile looks the same on a reload. */
const LEAN = [-6, 4, -3, 6, -2];

const Slot = ({
  node,
  offset,
  onThrow,
  still,
  classNames,
}: {
  node: ReactNode;
  offset: number;
  onThrow: () => void;
  still: boolean;
  classNames?: StackProps["classNames"];
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  /* Mostly horizontal: a card is thrown off a pile sideways. The vertical range is wider
     so the same wrist movement produces less tilt from it. */
  const rotateY = useTransform(x, [-160, 160], [-22, 22]);
  const rotateX = useTransform(y, [-240, 240], [14, -14]);

  if (still) return <li className={classNames?.stillSlot}>{node}</li>;

  return (
    <motion.li
      className={classNames?.slot}
      style={{ x, y, rotateX, rotateY, zIndex: offset }}
      /* ARRIVING FROM NOTHING rather than fading in, because what a pile usually means is
         that something was just dealt. The stagger runs up the pile - offset 0 is at the
         back - so the front item is the last thing to land. */
      initial={{ scale: 0.35, opacity: 0, y: 30 }}
      animate={{ rotate: LEAN[offset % LEAN.length], y: offset * -4, scale: 1, opacity: 1 }}
      transition={{ ...SPRING, delay: offset * 0.07 }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      whileTap={{ cursor: "grabbing" }}
      onDragEnd={(_event: unknown, info: PanInfo) => {
        if (Math.abs(info.offset.x) > SENSITIVITY || Math.abs(info.offset.y) > SENSITIVITY) {
          onThrow();
        }
        x.set(0);
        y.set(0);
      }}
    >
      {node}
    </motion.li>
  );
};

export const Stack = ({ items, onThrow, classNames, label }: StackProps) => {
  const still = useReducedMotion();

  /* The order is state because throwing changes it. Seeded from the props once: this is
     a pile somebody is rearranging, so later prop changes must not shuffle it under them. */
  const [order, setOrder] = useState(() => items.map((item) => item.id));

  const sendToBack = (id: string) => {
    setOrder((current) => [...current.filter((entry) => entry !== id), id]);
    onThrow?.(id);
  };

  const byId = new Map(items.map((item) => [item.id, item]));
  /* Anything the caller has since removed drops out; anything added lands at the back. */
  const shown = [
    ...order.filter((id) => byId.has(id)),
    ...items.map((item) => item.id).filter((id) => !order.includes(id)),
  ];

  return (
    <ul className={still ? classNames?.stillList : classNames?.list} aria-label={label}>
      {shown.map((id, index) => (
        <Slot
          key={id}
          node={byId.get(id)?.node}
          /* Counts down the array, and it is the z-index too: index 0 gets the highest
             offset, so the first item drawn here is the one in front. */
          offset={shown.length - 1 - index}
          onThrow={() => sendToBack(id)}
          still={Boolean(still)}
          classNames={classNames}
        />
      ))}
    </ul>
  );
};
