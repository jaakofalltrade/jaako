/**
 * Runtime checks against a TypeScript enum.
 *
 * An enum is a compile-time promise, and none of it survives into a JSON body or an
 * environment variable. Every place that needed to ask whether a string arriving from
 * outside is actually one of the members wrote out the same
 * `Object.values(...) as string[]` cast to do it.
 */

/**
 * Builds a type guard for one enum. Call it once, use it many times:
 *
 *     const isReason = isEnumValue(ContactReason);
 *     if (isReason(value)) { ... }  // value is ContactReason in here
 *
 * Curried rather than taking an args object like everything else in the codebase,
 * and that is not a style lapse. A type predicate can only narrow a parameter of the
 * function it is declared on, so `(args: { enumObject, value }): args.value is T` is
 * not something TypeScript can express. Returning a one-parameter guard is what keeps
 * the narrowing, and the narrowing is the entire point — without it every call site
 * needs an `as` cast, which is the thing being removed.
 *
 * The cast inside is the one place it is honest: Object.values on a string enum gives
 * T[], and the check being written is precisely "is this wider string one of those".
 */
export const isEnumValue =
  <T extends string>(enumObject: Record<string, T>) =>
  (value: string): value is T =>
    (Object.values(enumObject) as string[]).includes(value);
