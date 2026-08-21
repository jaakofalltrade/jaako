/**
 * Joins class names, dropping anything falsy.
 *
 * The one place in the codebase that builds a className string. It used to be
 * copy-pasted into thirteen call sites across twelve components.
 */
export const cx = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(" ");
