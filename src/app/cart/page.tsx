import type { Metadata } from 'next'
import { CartView } from '@/components/cart/cart-view'

/**
 * The cart and checkout, on one page.
 *
 * One page rather than a cart step and a separate checkout step, because for a
 * food order there is nothing to decide in between: the lines, the address and
 * the payment method all fit on one screen, and every extra step is a place to
 * abandon. Swiggy does the same.
 *
 * The whole thing is a Client Component, unusually for this codebase. The cart is
 * per-user and behind a bearer token held in localStorage, so there is nothing a
 * server render could produce except a skeleton — and nothing here is
 * indexable, which is the usual reason to render on the server.
 */
export const metadata: Metadata = {
  title: 'Your cart',
  // Never indexed: it is per-user and always empty to a crawler.
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        Your cart
      </h1>
      <CartView />
    </div>
  )
}
