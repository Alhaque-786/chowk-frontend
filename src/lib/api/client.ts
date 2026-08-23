/**
 * The single place that talks to the backend.
 *
 * Everything goes through `send`, so token handling, the response envelope, error
 * translation, timeouts, retries and refresh-on-401 exist exactly once. A
 * component calling `fetch` directly bypasses all six.
 *
 * Errors live in `./errors`, session storage in `./tokens`. This file is only the
 * request.
 */

import {
  ApiError,
  NetworkError,
  ServerError,
  TimeoutError,
  isRetryable,
} from './errors'
import { tokens } from './tokens'
import type { Envelope } from './types'

/**
 * Trailing slash stripped, because the env var is written by hand and
 * `.../api/v1/` + `/cart` gives `/api/v1//cart` — which some routers treat as a
 * different path and 404. Normalising once beats every call site remembering.
 */
const BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
).replace(/\/+$/, '')

/**
 * Default timeout.
 *
 * `fetch` has NONE. A connection that opens and then stalls hangs until the
 * browser gives up, which can be minutes — to a customer that is a spinner that
 * never resolves, and it is worse than an error because there is nothing to act
 * on. 15s is generous for this API, whose slowest measured endpoint was under
 * 100ms at p99, while still tolerating a bad mobile connection.
 */
const DEFAULT_TIMEOUT_MS = 15_000

/** Default attempts for a request that is safe to repeat. See `canRetry`. */
const DEFAULT_ATTEMPTS = 3

/** Ceiling on what a caller may ask for, so one call site cannot hammer a failing
 *  server for a minute. */
const MAX_ATTEMPTS_ALLOWED = 6

/** Base backoff. Full jitter is applied per attempt — see `backoffFor`. */
const RETRY_BASE_MS = 250

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Send the bearer token. Defaults to true; public reads pass false. */
  auth?: boolean
  /**
   * Makes a retried write safe. The backend replays the first response for a
   * repeated key, so a flaky network cannot produce a second order.
   *
   * It also UNLOCKS automatic retries for this call: without a key, a POST is
   * only retried when the request provably never arrived.
   */
  idempotencyKey?: string
  /** Next.js fetch cache. `fetch` is NOT cached by default in this version. */
  cache?: RequestCache
  revalidate?: number
  /** Caller's abort signal. Composed with the timeout, never replaced by it. */
  signal?: AbortSignal
  /** Override the default timeout. 0 disables it — use only for a known-slow
   *  endpoint, never as a way to silence a hang. */
  timeoutMs?: number
  /**
   * Retry policy for this call.
   *
   *   omitted   default of MAX_ATTEMPTS
   *   false     no retries — the caller handles failure itself
   *   true      the default, stated explicitly
   *   number    that many total attempts (1 means "try once", same as false)
   *
   * A number rather than only a boolean because the right count is a property of
   * the CALL, not of the transport: a build-time read can afford five attempts
   * and a poll that runs every fifteen seconds should not retry at all, since the
   * next tick is already the retry.
   */
  retry?: boolean | number
}

/** What a verb helper accepts. `method` and `body` come from the verb and the
 *  argument, so removing them here makes the wrong call impossible to write. */
export type CallOptions = Omit<RequestOptions, 'method' | 'body'>

// ---------------------------------------------------------------------------
// Session refresh
// ---------------------------------------------------------------------------

/**
 * Collapses concurrent refreshes into one.
 *
 * Without this, three requests 401-ing together would each POST /auth/refresh —
 * and since refresh tokens are single-use with reuse detection, the second and
 * third look like theft and revoke every session. The deduplication is not an
 * optimisation; it stops the client logging itself out.
 */
let refreshInFlight: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refresh = tokens.refresh()
    if (!refresh) return false

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      })
      if (!res.ok) {
        // The server rejected the refresh token: this session is over.
        tokens.clear()
        return false
      }
      const envelope = (await res.json()) as Envelope<{
        access_token: string
        refresh_token: string
      }>
      if (!envelope.data) {
        tokens.clear()
        return false
      }
      tokens.set(envelope.data.access_token, envelope.data.refresh_token)
      return true
    } catch {
      // A network failure is not a revoked session. Keep the tokens so the next
      // attempt can succeed — clearing here would sign people out on a tunnel.
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

// ---------------------------------------------------------------------------
// Retry policy
// ---------------------------------------------------------------------------

/** Methods that are idempotent by HTTP definition: repeating them cannot create
 *  a second side effect, whatever the server did with the first. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE'])

/**
 * Whether this failure may be retried.
 *
 * The subtle case is a POST. A POST that times out may have been processed, so
 * repeating it can place a second order. So a POST is retried only when either:
 *
 *   - it carries an idempotency key, which makes the server deduplicate it, or
 *   - the failure proves the request never arrived (NetworkError).
 *
 * That distinction is the whole reason `TimeoutError` is separate from
 * `NetworkError`: one means "never sent", the other means "we stopped listening".
 */
function canRetry(
  err: unknown,
  method: string,
  idempotencyKey: string | undefined,
  attempt: number,
  maxAttempts: number,
): boolean {
  if (attempt >= maxAttempts) return false
  if (!isRetryable(err)) return false

  if (SAFE_METHODS.has(method)) return true
  if (idempotencyKey) return true
  return err instanceof NetworkError
}

/**
 * Exponential backoff with FULL jitter: a uniform delay in [0, base * 2^n).
 *
 * Full jitter rather than base-plus-jitter because the goal is to SPREAD clients
 * that failed together — a fixed floor keeps them bunched at that floor and they
 * collide again. Same reasoning as the serialisable-retry backoff on the server.
 */
function backoffFor(attempt: number): number {
  return Math.random() * RETRY_BASE_MS * 2 ** (attempt - 1)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// The request
// ---------------------------------------------------------------------------

/**
 * Composes the caller's signal with the timeout.
 *
 * Both must be able to abort: the caller's for unmount, ours for a stall.
 * `AbortSignal.any` is the built-in way to say that; hand-rolling it with a
 * listener leaks the listener when the caller's signal outlives the request.
 */
function signalFor(options: RequestOptions): AbortSignal | undefined {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const timeout = timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined

  if (timeout && options.signal) return AbortSignal.any([options.signal, timeout])
  return timeout ?? options.signal
}

async function attempt<T>(
  path: string,
  options: RequestOptions,
  isAuthRetry: boolean,
): Promise<T> {
  const { method = 'GET', body, auth = true, idempotencyKey } = options

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
  if (auth) {
    const token = tokens.access()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: options.cache,
      signal: signalFor(options),
      ...(options.revalidate !== undefined
        ? { next: { revalidate: options.revalidate } }
        : {}),
    })
  } catch (cause) {
    // A timeout arrives as an AbortError, indistinguishable from an unmount
    // abort except by which signal fired. TimeoutError carries the different
    // retry meaning, so the two must not collapse into one.
    if (cause instanceof DOMException && cause.name === 'TimeoutError') {
      throw new TimeoutError(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    }
    // A caller-initiated abort is not a failure — rethrow it untouched so the
    // caller can recognise its own cancellation.
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new NetworkError(cause)
  }

  // 204 carries no body.
  if (res.status === 204) return undefined as T

  const text = await res.text()

  let envelope: Envelope<T>
  try {
    envelope = JSON.parse(text) as Envelope<T>
  } catch {
    // Not our envelope, so something upstream of the API answered: a proxy, a
    // gateway timeout page. The backend always sends the envelope, including for
    // 404s — so this is a ServerError, not a network problem.
    throw new ServerError(res.status, text.slice(0, 500))
  }

  if (!res.ok || envelope.error) {
    const error = new ApiError(
      res.status,
      envelope.error ?? { code: 'UNKNOWN', message: 'Something went wrong.' },
    )

    // One transparent refresh. `isAuthRetry` stops an expired refresh token from
    // looping, and this is separate from the retry loop below because a 401 is
    // not "try again", it is "get a new token and try once".
    if (error.isAuthFailure && auth && !isAuthRetry && tokens.refresh()) {
      if (await refreshSession()) return attempt<T>(path, options, true)
    }
    throw error
  }

  return envelope.data as T
}

/**
 * The low-level call, with timeout and retry applied.
 *
 * Prefer `api.get` / `api.post`. This stays exported for the rare caller that
 * needs to choose `method` at runtime.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? 'GET'
  const maxAttempts = attemptsFor(options.retry)
  let lastError: unknown

  for (let n = 1; n <= maxAttempts; n++) {
    try {
      return await attempt<T>(path, options, false)
    } catch (err) {
      lastError = err
      if (!canRetry(err, method, options.idempotencyKey, n, maxAttempts)) throw err
      await sleep(backoffFor(n))
    }
  }
  throw lastError
}

/**
 * Turns the `retry` option into an attempt count.
 *
 * Clamped at both ends: below 1 would mean "never even try", and the upper bound
 * stops a single call site from hammering a failing server for a minute because
 * somebody typed 50.
 */
function attemptsFor(retry: boolean | number | undefined): number {
  if (retry === false) return 1
  if (retry === true || retry === undefined) return DEFAULT_ATTEMPTS
  return Math.min(Math.max(Math.trunc(retry), 1), MAX_ATTEMPTS_ALLOWED)
}

/**
 * The verb-shaped interface every service uses.
 *
 * `request('/cart/items', { method: 'POST', body: input })` states the same thing
 * three times and buries the interesting part — the path — behind ceremony.
 * `api.post('/cart/items', input)` reads as the sentence it is.
 *
 * It also removes a class of mistake rather than just noise. With `method` in an
 * options bag, `request(path, { body })` silently sends a GET with a body, which
 * some servers accept and most ignore — no type error, no runtime error, a
 * request that quietly does nothing. Here the verb picks the method, so that call
 * cannot be written: `CallOptions` omits `method` and `body` entirely.
 */
export const api = {
  get: <T>(path: string, options: CallOptions = {}): Promise<T> =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options: CallOptions = {}): Promise<T> =>
    request<T>(path, { ...options, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, options: CallOptions = {}): Promise<T> =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  put: <T>(path: string, body?: unknown, options: CallOptions = {}): Promise<T> =>
    request<T>(path, { ...options, method: 'PUT', body }),

  // `delete` is a reserved word, but a reserved word is a legal property name.
  // `api.delete(...)` matching the HTTP verb is worth more than avoiding it.
  delete: <T>(path: string, options: CallOptions = {}): Promise<T> =>
    request<T>(path, { ...options, method: 'DELETE' }),
} as const

/**
 * Generates an idempotency key for a write.
 *
 * The key must be stable across retries of the SAME logical action, so it is
 * generated once by the caller and reused — generating it per attempt would
 * defeat the entire mechanism. That is why this is a separate function and not
 * something the transport does for you.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `key-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
