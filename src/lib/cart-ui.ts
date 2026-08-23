'use client'

/**
 * Opens the cart drawer from anywhere.
 *
 * Same shape as `auth-gate`, and for the same reason: the drawer is ONE instance
 * mounted in the layout, and several unrelated things need to open it — the
 * header button, the sticky bottom bar, and later an "added to cart" toast. A
 * Context provider would re-render every consumer beneath it on open, and the
 * consumers here include the whole menu.
 *
 * Deliberately NOT a route. The drawer's entire purpose is that checking your
 * cart should not cost you your place on a menu you have scrolled halfway down.
 */

const OPEN_EVENT = 'chowk:open-cart'

export function openCart(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export function onOpenCart(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(OPEN_EVENT, handler)
  return () => window.removeEventListener(OPEN_EVENT, handler)
}
