/**
 * What a call that can fail hands back.
 *
 * A DISCRIMINATED UNION RATHER THAN AN EXCEPTION, and the reason is where the failure gets
 * handled. A thrown error travels as far as somebody remembers to catch it, which on a
 * page is usually an error boundary several components away - so one failed request
 * replaces a whole screen instead of putting a sentence under a button. This makes the
 * failure a value, caught at the layer that made the call.
 *
 * TYPESCRIPT IS WHAT MAKES IT A RULE. `data` does not exist until `ok` has been checked,
 * so a caller cannot read the happy path without having written the unhappy one. That is
 * the difference between a convention and something the compiler enforces.
 *
 * `error` IS A SENTENCE FOR A PERSON, never an exception message or a status code. The
 * service that produced it chose the words; the component renders them. An empty string is
 * the one special value: it means the call was aborted by its own caller, which is not a
 * failure anybody should be told about.
 */
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
