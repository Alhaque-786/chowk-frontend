'use client'

import { useEffect, useRef, useState } from 'react'
import { useCartCount } from '@/lib/cart-store'
import { openCart } from '@/lib/cart-ui'

/**
 * The cart entry point, with a live item count.
 *
 * A Client Component because the count changes without navigation. It is
 * deliberately the ONLY client island in the header — isolating it keeps the nav
 * and logo on the server.
 *
 * Opens the drawer rather than navigating to /cart. Checking the cart is something
 * people do repeatedly mid-order, and a navigation costs them their scroll
 * position on the menu every time.
 */
export function CartButton() {
  const count = useCartCount()

  /*
    Bumps the badge when the count CHANGES — not on mount.

    Keyed on the previous value rather than a boolean, because the animation has
    to restart for a second change in quick succession. Re-keying the element is
    what makes CSS replay the keyframes; toggling a class does nothing if the
    class is already there.
  */
  const previous = useRef(count)
  const [bumpKey, setBumpKey] = useState(0)

  useEffect(() => {
    if (previous.current !== count && count > 0) setBumpKey((k) => k + 1)
    previous.current = count
  }, [count])

  return (
    <button
      type="button"
      onClick={openCart}
      className="relative inline-flex min-h-10 items-center gap-2 rounded-xl border border-rule-strong bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-sunk"
      // The count is in the accessible name, so a screen reader hears "Cart, 3
      // items" rather than reading the badge as a stray number.
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart, empty'}
    >
      <BagIcon />
      <span className="hidden sm:inline">Cart</span>
      {count > 0 && (
        <span
          key={bumpKey}
          className="badge-bump grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[0.6875rem] font-semibold text-brand-ink tabular"
          // Decorative: the count is already in the button's accessible name, so
          // announcing it twice would be noise.
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

function BagIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
      <path
        d="M4 6.5h12l-1 10.5a1 1 0 0 1-1 .9H6a1 1 0 0 1-1-.9L4 6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7.25 6.5V5a2.75 2.75 0 0 1 5.5 0v1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
