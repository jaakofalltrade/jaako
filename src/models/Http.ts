/**
 * The status codes the two route handlers actually answer with.
 *
 * The one enum whose values aren't shouty strings — they're numbers, so there's
 * nothing to capitalise.
 */
export enum HttpStatus {
  Ok = 200,
  BadRequest = 400,
  TooManyRequests = 429,
  BadGateway = 502,
  ServiceUnavailable = 503,
}
