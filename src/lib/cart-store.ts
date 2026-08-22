'use client'

import { useEffect, useState } from 'react'

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

export function useCartCount(): number {
  // Starts at 0 on both server and client so the first client render matches the
  // server HTML. Reading localStorage in the initial state would produce a
  // hydration mismatch, which React reports as an error and resolves by
  // discarding the server HTML.
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(read())

    const onChange = (e: Event) => {
      setCount((e as CustomEvent<number>).detail ?? read())
    }
    // `storage` covers the other-tab case: adding to the cart in one tab should
    // update the badge in another.
    const onStorage = () => setCount(read())

    window.addEventListener(EVENT, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(EVENT, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return count
}
