/**
 * The status codes the two route handlers actually answer with.
 *
 * The one enum whose values aren't shouty strings — they're numbers, so there's
 * nothing to capitalise.
 */
export enum HttpStatus {
  Ok = 200,
  BadRequest = 400,
  /** The track is already on the playlist. Not an error in the request's shape. */
  Conflict = 409,
  TooManyRequests = 429,
  BadGateway = 502,
  ServiceUnavailable = 503,
}
