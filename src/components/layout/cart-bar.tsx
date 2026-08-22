'use client'

import Link from 'next/link'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCartCount } from '@/lib/cart-store'

/**
 * The sticky cart bar.
 *
 * The signature pattern of every food app, and for a good reason: once something
 * is in the cart, "go to checkout" must be reachable from anywhere without
 * hunting for the header. It is the single highest-value piece of navigation in
 * the product.
 *
 * Sits above the safe-area inset so it clears the home indicator on a modern
 * iPhone, where a fixed bottom bar otherwise ends up half under the gesture area.
 */
export function CartBar() {
  const count = useCartCount()
  const reduce = useReducedMotion()

  const bar = (
    <Link
      href="/cart"
      className="flex items-center justify-between gap-4 rounded-[--radius] bg-brand px-4 py-3.5 text-brand-ink shadow-lg"
    >
      <span className="flex items-center gap-2.5">
        <ShoppingBag className="size-5" />
        <span className="text-sm font-semibold tabular">
          {count} {count === 1 ? 'item' : 'items'} in your cart
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-sm font-bold">
        Checkout
        <ArrowRight className="size-4" />
      </span>
    </Link>
  )

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          initial={reduce ? undefined : { y: 80, opacity: 0 }}
          animate={reduce ? undefined : { y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <div className="mx-auto max-w-2xl">{bar}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
