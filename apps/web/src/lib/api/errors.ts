/**
 * Every way an API call can fail.
 *
 * Its own module because these are the vocabulary of the whole app: components
 * catch them, services let them through, and the transport is only one of several
 * things that throws them. Keeping them beside the `fetch` code implied they were
 * an implementation detail of it, and made `client.ts` a file you had to read
 * past to find the request logic.
 *
 * FOUR distinct failures, not one. The distinction is not pedantry — each one
 * needs a different response from the caller, and collapsing them is how a
 * customer gets told to check their wifi when the server is down:
 *
 *   ApiError      the API answered, and said no. Has a stable code to branch on.
 *   NetworkError  nothing reached the server. Safe to retry: nothing happened.
 *   TimeoutError  we gave up waiting. The server MAY have done the work.
 *   ServerError   the API answered, but not with our envelope (a 502 HTML page).
 */

import type { ApiErrorBody } from './types'

/**
 * The API answered with a structured refusal.
 *
 * Carries the backend's STABLE `code`, not just a message. UI logic branches on
 * the code; branching on the message would break the moment someone improves the
 * copy, and the backend treats those messages as customer-facing text that is
 * expected to change.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly fields?: Record<string, string>
  readonly traceId?: string

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.fields = body.fields
    this.traceId = body.trace_id
  }

  /** The customer needs to sign in again — not merely retry. */
  get isAuthFailure(): boolean {
    return (
      this.status === 401 ||
      this.code === 'TOKEN_EXPIRED' ||
      this.code === 'SESSION_REVOKED' ||
      this.code === 'TOKEN_REUSE_DETECTED'
    )
  }

  /**
   * Worth another attempt.
   *
   * 429 and 5xx only. A 4xx is the caller's fault and will fail identically
   * forever, so retrying it just delays the error and doubles the load.
   */
  get isRetryable(): boolean {
    return this.status === 429 || this.status >= 500
  }

  /** True when the customer's input was rejected — attach `fieldErrors` to the
   *  form rather than showing a banner. */
  get isValidation(): boolean {
    return this.status === 400 || this.status === 422
  }

  /** Attach these to form inputs rather than showing one banner. */
  get fieldErrors(): Record<string, string> {
    return this.fields ?? {}
  }
}

/**
 * The request never reached the API — offline, DNS, connection refused.
 *
 * Always retryable, and that is a real guarantee rather than an optimistic one:
 * if nothing reached the server, nothing was processed, so repeating it cannot
 * duplicate a side effect.
 */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Could not reach the server. Check your connection and try again.')
    this.name = 'NetworkError'
    this.cause = cause
  }

  get isRetryable(): boolean {
    return true
  }
}

/**
 * We stopped waiting.
 *
 * Deliberately NOT a NetworkError, because the two differ on the only question
 * that matters for a write: a timeout means the server may have completed the
 * work and we simply never heard the answer. Retrying a checkout after a timeout
 * without an idempotency key is how a customer gets charged twice.
 */
export class TimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super('That took too long. Please try again.')
    this.name = 'TimeoutError'
  }

  get isRetryable(): boolean {
    return true
  }
}

/**
 * The API answered, but not with our envelope.
 *
 * A 502 from a load balancer is an HTML page: the network worked perfectly and
 * the server is unhealthy. This used to be reported as a NetworkError, which told
 * the customer to check their connection — and, worse, hid the status from every
 * retry decision, so the one failure that most deserves a retry never got one.
 */
export class ServerError extends Error {
  constructor(
    readonly status: number,
    /** Kept for logging. Never shown: it is somebody else's error page. */
    readonly bodyText: string,
  ) {
    super('The server had a problem. Please try again in a moment.')
    this.name = 'ServerError'
  }

  get isRetryable(): boolean {
    return this.status === 429 || this.status >= 500
  }
}

/** Any failure this layer can throw. */
export type RequestFailure = ApiError | NetworkError | TimeoutError | ServerError

/**
 * Whether an unknown caught value is worth retrying.
 *
 * A free function rather than only a getter, because `catch` gives you `unknown`
 * and every call site would otherwise repeat the same four `instanceof` checks —
 * and the one that forgets a class silently stops retrying that case.
 */
export function isRetryable(err: unknown): boolean {
  if (
    err instanceof ApiError ||
    err instanceof NetworkError ||
    err instanceof TimeoutError ||
    err instanceof ServerError
  ) {
    return err.isRetryable
  }
  // An unrecognised throw is a bug in our code, not a flaky server. Retrying it
  // would just run the bug again.
  return false
}

/**
 * The message to show a customer, for any caught value.
 *
 * Prefers the SERVER's wording when there is one: the backend writes those for
 * customers — "That code has expired", "Only 2 left" — and each implies a
 * different next action. A single house string would discard the only useful part.
 */
export function messageFor(err: unknown, fallback = 'Something went wrong.'): string {
  if (err instanceof ApiError && err.message) return err.message
  if (
    err instanceof NetworkError ||
    err instanceof TimeoutError ||
    err instanceof ServerError
  ) {
    return err.message
  }
  return fallback
}
