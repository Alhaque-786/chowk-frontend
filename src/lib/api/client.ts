/**
 * The single place that talks to the backend.
 *
 * Everything goes through `request()`, which means token handling, the response
 * envelope, error translation and refresh-on-401 exist exactly once. A component
 * that calls `fetch` directly bypasses all four, so it should not.
 */

import type { ApiErrorBody, Envelope } from './types'

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'

/**
 * ApiError carries the backend's STABLE code, not just a message.
 *
 * UI logic branches on `code`. Branching on `message` would break the moment
 * someone improves the copy, and the backend treats those messages as
 * customer-facing text that is expected to change.
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

  /** Worth surfacing a "try again" affordance rather than a hard failure. */
  get isRetryable(): boolean {
    return this.status === 429 || this.status >= 500
  }

  /** Attach these to form inputs rather than showing one banner. */
  get fieldErrors(): Record<string, string> {
    return this.fields ?? {}
  }
}

/** Thrown when the network never reached the API, which is a different problem. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Could not reach the server. Check your connection and try again.')
    this.name = 'NetworkError'
    this.cause = cause
  }
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

const ACCESS_KEY = 'chowk.access_token'
const REFRESH_KEY = 'chowk.refresh_token'

/**
 * Tokens live in localStorage.
 *
 * The honest trade: this is readable by any script on the origin, so an XSS
 * becomes a token theft. httpOnly cookies would prevent that, but need the API
 * to set them — which means a same-site deployment or a proxy route, and CSRF
 * protection on every mutation.
 *
 * localStorage is the right call for now because the access token lives 15
 * minutes and refresh tokens rotate with reuse detection, so a stolen token is
 * one extra session rather than permanent access. Revisit before handling
 * anything more sensitive than an order history.
 *
 * Every accessor is guarded: this module is imported by Server Components where
 * `window` does not exist, and a bare `localStorage` reference would crash the
 * render rather than the call.
 */
export const tokens = {
  access(): string | null {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(ACCESS_KEY)
    } catch {
      // Private mode, or site data blocked. Treat as signed out.
      return null
    }
  },

  refresh(): string | null {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(REFRESH_KEY)
    } catch {
      return null
    }
  },

  set(access: string, refresh: string): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(ACCESS_KEY, access)
      window.localStorage.setItem(REFRESH_KEY, refresh)
    } catch {
      // Nothing useful to do; the session simply will not persist a reload.
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(ACCESS_KEY)
      window.localStorage.removeItem(REFRESH_KEY)
    } catch {
      /* ignore */
    }
  },

  isSignedIn(): boolean {
    return tokens.access() !== null
  },
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Send the bearer token. Defaults to true; public reads pass false. */
  auth?: boolean
  /**
   * Makes a retried write safe. The backend replays the first response for a
   * repeated key, so a flaky mobile network cannot produce a second order.
   * Required by the API on checkout.
   */
  idempotencyKey?: string
  /** Next.js fetch cache. `fetch` is NOT cached by default in this version. */
  cache?: RequestCache
  revalidate?: number
  signal?: AbortSignal
}

/**
 * refreshInFlight collapses concurrent refreshes.
 *
 * Without it, three requests 401-ing together would each POST /auth/refresh —
 * and since refresh tokens are single-use with reuse detection, the second and
 * third would look like theft and revoke every session. So the deduplication is
 * not an optimisation; it prevents the client logging itself out.
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      })
      if (!res.ok) {
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
      // A network failure is not a revoked session; keep the tokens so the next
      // attempt can succeed.
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

async function send<T>(
  path: string,
  options: RequestOptions,
  isRetry: boolean,
): Promise<T> {
  const { method = 'GET', body, auth = true, idempotencyKey } = options

  const headers: Record<string, string> = {}
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
      signal: options.signal,
      ...(options.revalidate !== undefined
        ? { next: { revalidate: options.revalidate } }
        : {}),
    })
  } catch (cause) {
    throw new NetworkError(cause)
  }

  // 204 has no body to parse.
  if (res.status === 204) return undefined as T

  let envelope: Envelope<T>
  try {
    envelope = (await res.json()) as Envelope<T>
  } catch (cause) {
    // A non-JSON response means something upstream of the API answered — a
    // proxy, a gateway timeout page. The backend itself always sends the
    // envelope, including for 404s.
    throw new NetworkError(cause)
  }

  if (!res.ok || envelope.error) {
    const error = new ApiError(
      res.status,
      envelope.error ?? { code: 'UNKNOWN', message: 'Something went wrong.' },
    )

    // One transparent refresh attempt. `isRetry` stops an expired refresh token
    // from looping.
    if (error.isAuthFailure && auth && !isRetry && tokens.refresh()) {
      if (await refreshSession()) {
        return send<T>(path, options, true)
      }
    }
    throw error
  }

  return envelope.data as T
}

/** Make an API call. Throws ApiError or NetworkError; never returns an error. */
export function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return send<T>(path, options, false)
}

/**
 * Generates an idempotency key for a write.
 *
 * crypto.randomUUID where available. The key must be stable across retries of
 * the SAME logical action, so it is generated once by the caller and reused —
 * generating it inside the retry would defeat the entire mechanism.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `key-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
