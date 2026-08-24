import { API_BASE_URL } from './api-host'

/**
 * The API call, for the mobile app.
 *
 * Small on purpose. This is NOT a port of the web app's client — that one carries
 * token refresh, idempotency keys and a retry loop, and mobile needs a different
 * shape for two of those: retries belong to TanStack Query here, and the token
 * store will be expo-secure-store rather than localStorage.
 *
 * When both apps genuinely need the same logic, THAT is the moment to extract
 * `packages/core` — with the boundary visible rather than guessed. Copying the web
 * client here now would be guessing, and would have to be undone.
 */

/** The API's envelope. Every response is wrapped in it, including errors. */
type Envelope<T> = { data?: T; error?: { code: string; message: string } }

/** Carries the status, so the retry policy can refuse to retry a 4xx. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Composes the caller's signal with a timeout, WITHOUT relying on AbortSignal.any.
 *
 * `AbortSignal.any` and `AbortSignal.timeout` are recent additions, and Hermes —
 * React Native's engine — is not the same JavaScript runtime as a browser. Using
 * them directly risks a TypeError at request time on some devices, which surfaces
 * as "the app does nothing when I open it" and is miserable to trace back to a
 * missing built-in.
 *
 * So this composes manually with a controller and a timer, which exist everywhere.
 * The timer is CLEARED when the caller aborts, because a stray 10-second timer per
 * cancelled request is a slow leak on a screen somebody scrolls.
 */
function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const controller = new AbortController()

  const timer = setTimeout(() => controller.abort(new Error('Request timed out')), ms)

  const cleanup = () => clearTimeout(timer)
  controller.signal.addEventListener('abort', cleanup, { once: true })

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason)
    } else {
      signal.addEventListener('abort', () => controller.abort(signal.reason), {
        once: true,
      })
    }
  }
  return controller.signal
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    // React Native's fetch has no timeout, exactly like the browser's.
    signal: withTimeout(signal, 10_000),
  })

  const body = (await res.json()) as Envelope<T>

  if (!res.ok || body.error) {
    throw new ApiError(
      res.status,
      body.error?.code ?? 'UNKNOWN',
      // The backend writes these for customers, so they are shown as-is.
      body.error?.message ?? 'Something went wrong.',
    )
  }
  return body.data as T
}
