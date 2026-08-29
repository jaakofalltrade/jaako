/**
 * One GET whose failures are all the same failure.
 *
 * For a call where nothing the server says on a bad day is worth reading: any refusal,
 * any network fault and any unparseable body all mean "render the offline shape". Both
 * Spotify calls are exactly that, and both had written out the same try / check ok /
 * parse / fall back by hand.
 *
 * NOT USED BY contactApi.send, and that is the interesting part. It parses the body
 * whatever the status, because a 400 or a 429 from our own contact route carries the
 * sentence the sender is meant to read — "that e-mail address doesn't look right",
 * "slow down, try again in a few minutes". Routing it through here would answer every
 * one of those with the generic network-failure line and throw away the real reason.
 * A helper that fits two of three call sites is doing its job; forcing the third
 * through it would be losing behaviour to gain a shared line.
 */
export const getJson = async <T>(args: {
  url: string;
  /** Returned for every failure. Give it the shape the caller renders when there is no data. */
  fallback: T;
  init?: RequestInit;
}): Promise<T> => {
  const { url, fallback, init } = args;

  try {
    const response = await fetch(url, init);
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    // Network failure, an aborted request, or a body that isn't JSON. The caller
    // checks signal.aborted before using what comes back.
    return fallback;
  }
};
