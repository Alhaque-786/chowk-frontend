'use client'

import { useSyncExternalStore } from 'react'

/**
 * The cart item count, for the header badge.
 *
 * The cart itself lives on the SERVER, in Redis, keyed by user — see the
 * `ordering` module. This is only a local mirror of the count so the badge can
 * update the instant something is added, without waiting for a round trip.
 *
 * A custom event rather than Context or a store library: the only consumer is one
 * badge, and a provider wrapping the whole tree to share a single number would
 * force every page under it to re-render on a cart change. This keeps the
 * subscription to the one component that needs it.
 *
 * Deliberately NOT the source of truth. Checkout reads the server cart, so a
 * stale count here shows a wrong badge — cosmetic — rather than a wrong order.
 *
 * Read through useSyncExternalStore rather than useState+useEffect. That is what
 * the hook is for: localStorage plus an event is literally an external store, and
 * the effect version had to set state on mount to pick up the stored value, which
 * costs a second render on every page load and is exactly the cascading-render
 * pattern React 19 warns about. useSyncExternalStore also takes a separate SERVER
 * snapshot, so the hydration-mismatch problem the effect was working around is
 * handled by the API instead of by us.
 */

const EVENT = 'chowk:cart-changed'
const STORAGE_KEY = 'chowk.cart_count'

function read(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const n = raw ? Number.parseInt(raw, 10) : 0
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

/** Publishes a new count. Call after any successful cart mutation. */
export function setCartCount(count: number): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(count))
  } catch {
    // Private mode. The badge just will not survive a reload.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: count }))
}

/**
 * Module-scope subscribe, so the identity is stable across renders. Passing an
 * inline closure here would make React resubscribe on every render.
 *
 * `storage` covers the other-tab case: adding to the cart in one tab should
 * update the badge in another.
 */
function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    window.removeEventListener(EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

/** The server snapshot. 0 because there is no request-scoped cart to read. */
function getServerSnapshot(): number {
  return 0
}

export function useCartCount(): number {
  // `read` returns a number, not an object, so referential equality holds and
  // React will not loop. Returning a fresh object from a snapshot is the one way
  // to get this hook wrong.
  return useSyncExternalStore(subscribe, read, getServerSnapshot)
}
