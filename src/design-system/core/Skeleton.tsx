import { cx } from "@/utils/cx";

export type SkeletonProps = {
  /**
   * How many bars to stack. One by default, and every bar in a stack is drawn full
   * width — a short last line would be right for prose and wrong for a list of rows,
   * which is the shape this is mostly asked for.
   */
  lines?: number;
  className?: string;
};

/**
 * The shape of something that has not arrived yet.
 *
 * A placeholder rather than a spinner, and the difference is the whole point: a spinner
 * says "wait", a placeholder says "a cover goes here and it is this big". The page is
 * laid out before the data lands, so nothing jumps when it does.
 *
 * Deliberately unopinionated about size. One bar by default, `lines` for a stack of
 * them, and the caller gives the wrapper a class that says how big — a cover is this
 * with a width and a height on it, a paragraph is this with lines={3}, and a row height
 * other than one line of text is --skeleton-bar on that class. Anything more
 * specific than that belongs in the module of the page doing the asking, because the
 * shapes are that page's layout and not this component's business.
 *
 * IT PULSES, AND THE PULSE IS A PROMISE. suggest.module.scss makes the opposite call
 * for the teaser's empty queue rows and says why: nothing is coming, so a shimmer there
 * would be an animation that never resolves. Use this only where a fetch is genuinely
 * in flight. The animation is opacity alone, so it can never reflow, and it is dropped
 * under prefers-reduced-motion.
 *
 * DECORATIVE, ALWAYS. Every bar is aria-hidden and there is no label on it, because a
 * reader should hear "loading" once for the region rather than once per shape. That
 * announcement belongs on whatever owns the fallback — see the role="status" wrappers
 * in app/lab/(framed)/suggest/page.tsx.
 */
export const Skeleton = ({ lines = 1, className }: SkeletonProps) => (
  <span aria-hidden="true" className={cx("jk-skeleton", className)}>
    {Array.from({ length: lines }, (_, index) => (
      <span key={index} className="jk-skeleton__bar" />
    ))}
  </span>
);
