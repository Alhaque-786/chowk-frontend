'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, ShoppingBag } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { CartLines, CartTotals } from './cart-lines'
import { formatRupees } from '@/lib/format'
import { messageFor } from '@/lib/api/errors'
import { onOpenCart } from '@/lib/cart-ui'
import { requireAuth, useIsSignedIn } from '@/lib/auth-gate'
import OrderingService from '@/services/OrderingService'
import type { Cart } from '@/lib/api/types'

/**
 * The cart, without leaving the menu.
 *
 * This is the single highest-value interaction in the product, and the reason is
 * mundane: checking your cart mid-order is something people do repeatedly, and
 * making it a page navigation means every check costs you your scroll position on
 * a menu you were halfway down. The drawer removes that entirely — adjust a
 * quantity, see the new total, carry on ordering.
 *
 * It stops at "review and pay". Address and payment stay on /cart, because those
 * need room and are a one-time decision per order, not a repeated glance.
 *
 * ONE instance, in the layout, opened by an event — see lib/cart-ui. Fetches only
 * when opened, so the drawer costs nothing until somebody wants it.
 */
export function CartDrawer() {
  const [open, setOpen] = useState(false)
  const [cart, setCart] = useState<Cart | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signedIn = useIsSignedIn()

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const next = await OrderingService.getCart({ signal })
      setCart(next)
      setError(null)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(messageFor(err, 'Could not load your cart.'))
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => onOpenCart(() => setOpen(true)), [])

  useEffect(() => {
    if (!open || !signedIn) return
    // Re-read on every open rather than trusting what was fetched last time. A
    // cart can change from another tab, and prices can change under it — a stale
    // total in the one place somebody is checking the total is the worst place
    // for one.
    const controller = new AbortController()
    /*
      eslint-disable-next-line react-hooks/set-state-in-effect --
      Every setState in `load` runs after an await; the rule cannot see through
      the async boundary. Same situation, and the same real caveat, as the cart
      page: fetching in an effect is the wrong tool, and a data library is the
      actual fix rather than this suppression.
    */
    void load(controller.signal)
    return () => controller.abort()
  }, [open, signedIn, load])

  async function changeQuantity(lineId: string, next: number) {
    setBusy(true)
    try {
      setCart(await OrderingService.setQuantity(lineId, next))
      setError(null)
    } catch (err) {
      setError(messageFor(err, 'Could not update that.'))
    } finally {
      setBusy(false)
    }
  }

  const empty = !cart || cart.lines.length === 0
  const blocked = cart ? !cart.kitchen_open || cart.lines.some((l) => !l.is_available) : false

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="Your cart"
      description={
        cart && !empty
          ? `${cart.item_count} ${cart.item_count === 1 ? 'item' : 'items'}`
          : undefined
      }
      footer={
        signedIn && !empty ? (
          <div className="flex flex-col gap-2">
            {blocked && (
              <p className="text-center text-xs text-danger" role="status">
                {cart && !cart.kitchen_open
                  ? (cart.closed_reason ?? 'This kitchen is closed right now.')
                  : 'Remove the sold-out items to continue.'}
              </p>
            )}
            {/*
              A LINK, not a button that navigates. The customer gets the middle
              click, the long press, the open-in-new-tab — and it prefetches. A
              button here would take all three away for no gain.
            */}
            <Link href="/cart" onClick={() => setOpen(false)}>
              <Button fullWidth size="lg" disabled={busy || blocked}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Review and pay
                <span className="tabular ml-auto font-semibold">
                  {cart ? formatRupees(cart.total_minor) : ''}
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        ) : undefined
      }
    >
      {!signedIn ? (
        <EmptyState
          tone="plain"
          title="Sign in to see your cart"
          body="Your cart lives with your account, so it is waiting for you on any device."
          action={
            <Button onClick={() => void requireAuth('Sign in to see your cart.')}>
              Sign in
            </Button>
          }
        />
      ) : !loaded ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : empty ? (
        <EmptyState
          tone="plain"
          icon={ShoppingBag}
          title="Nothing in your cart"
          body="Add something from the menu and it will show up here."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {cart && !cart.kitchen_open && (
            <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger" role="status">
              {cart.closed_reason ?? 'This kitchen is closed right now.'} Your cart
              is saved.
            </p>
          )}

          {cart && <CartLines cart={cart} onQuantityChange={changeQuantity} busy={busy} compact />}

          {error && (
            <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          {cart && (
            <div className="border-t border-rule pt-4">
              <CartTotals cart={cart} />
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
