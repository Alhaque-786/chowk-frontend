/**
 * Where the session lives, and how the rest of the app learns it changed.
 *
 * Its own module because storage is a policy decision, not a transport detail.
 * The trade-off documented below is the kind of thing that gets revisited by
 * somebody who is not looking for it inside a `fetch` wrapper.
 */

const ACCESS_KEY = 'chowk.access_token'
const REFRESH_KEY = 'chowk.refresh_token'

/**
 * Tokens live in localStorage.
 *
 * The honest trade: this is readable by any script on the origin, so an XSS
 * becomes a token theft. httpOnly cookies would prevent that, but need the API to
 * set them — which means a same-site deployment or a proxy route, plus CSRF
 * protection on every mutation.
 *
 * localStorage is the right call for now because the access token lives 15
 * minutes and refresh tokens rotate with reuse detection, so a stolen token is
 * one extra session rather than permanent access. Revisit before this app handles
 * anything more sensitive than an order history.
 *
 * Every accessor is guarded twice: `window` is absent in Server Components, and
 * even in a browser the accessor itself throws when site data is blocked. A bare
 * `localStorage` reference would crash the render rather than the call.
 */

/**
 * Fired whenever the stored session changes.
 *
 * Without this, a component asking "is somebody signed in" has no way to find out
 * except reading localStorage inside an effect and calling setState — a cascading
 * render, and one React 19 flags as an error. Publishing the change lets
 * `useIsSignedIn` read it as an external store instead, with no extra render on
 * mount. Same mechanism as `cart-store`, for the same reason.
 */
const SESSION_EVENT = 'chowk:session-changed'

function announce(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(SESSION_EVENT))
}

/**
 * Subscribes to sign-in and sign-out. Returns an unsubscribe function.
 *
 * Listens for `storage` as well, so signing out in one tab signs out the others.
 * That matters on a shared machine: closing one tab should not leave a live
 * session in another.
 */
export function onSessionChange(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(SESSION_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(SESSION_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

function read(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Private mode, or site data blocked. Treat as signed out.
    return null
  }
}

export const tokens = {
  access: (): string | null => read(ACCESS_KEY),
  refresh: (): string | null => read(REFRESH_KEY),

  set(access: string, refresh: string): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(ACCESS_KEY, access)
      window.localStorage.setItem(REFRESH_KEY, refresh)
    } catch {
      // Nothing useful to do; the session just will not survive a reload.
    }
    // Announced even when the write failed: the caller IS authenticated for this
    // page view, and the UI should follow that rather than the storage.
    announce()
  },

  clear(): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(ACCESS_KEY)
      window.localStorage.removeItem(REFRESH_KEY)
    } catch {
      /* ignore */
    }
    announce()
  },

  /**
   * Whether a token is stored. Says nothing about validity — only the server can
   * rule on that, and the next request will find out.
   *
   * This is the ONE definition of "signed in". Everything else re-exports it
   * rather than reading localStorage again, because two functions answering the
   * same question is how they come to disagree.
   */
  isSignedIn: (): boolean => read(ACCESS_KEY) !== null,
} as const
