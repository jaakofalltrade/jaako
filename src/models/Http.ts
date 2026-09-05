/**
 * The status codes the two route handlers actually answer with.
 *
 * The one enum whose values aren't shouty strings — they're numbers, so there's
 * nothing to capitalise.
 */
export enum HttpStatus {
  Ok = 200,
  BadRequest = 400,
  /**
   * The pack asked for is not one this site publishes.
   *
   * 404 RATHER THAN 403 ON PURPOSE. The deepcuts route checks the requested playlist
   * against the shelf, which is the list of playlists already made public. Whether some
   * other id exists on a private library is not this site's news to break, and 403 would
   * break it - it says "this exists and you may not have it".
   */
  NotFound = 404,
  /** The track is already on the playlist. Not an error in the request's shape. */
  Conflict = 409,
  TooManyRequests = 429,
  BadGateway = 502,
  ServiceUnavailable = 503,
}
