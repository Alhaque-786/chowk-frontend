'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { formatRupees } from '@/lib/format'
import { requireAuth, useIsSignedIn } from '@/lib/auth-gate'
import { messageFor } from '@/lib/api/errors'
import OrderingService from '@/services/OrderingService'
import AddressService from '@/services/AddressService'
import type { Address, Cart } from '@/lib/api/types'

/**
 * The cart, its totals, and the place-order action.
 *
 * Reads the SERVER cart on mount and re-reads it after every mutation rather than
 * patching a local copy. That is deliberate: the server owns prices, tax and
 * fees, and a locally-maintained total drifts from the real one the moment a
 * kitchen edits a menu — with the customer finding out at the payment screen.
 * One extra round trip per change is a cheap price for a total that is never
 * wrong.
 */
export function CartView() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressId, setAddressId] = useState<string | null>(null)
  /*
    `loaded` rather than `loading`, and the difference matters.

    A `loading` flag has to be switched off from wherever the load ends —
    including the branch where there is nothing to load, which meant calling
    setState inside the effect body and tripping the cascading-render rule. A
    "has the fetch finished" flag is only ever set from the async path, so
    `loading` can be DERIVED below. Deriving state you can compute is almost
    always better than storing it: there is no second place for it to be wrong.
  */
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  /*
    Read as an external store, NOT mirrored into state via an effect.

    The version this replaces did `setNeedsSignIn(true); setLoading(false)` inside
    an effect body, which renders once with the wrong answer and again with the
    right one — a cascading render React 19 reports as an error, and a visible
    flash of the signed-out panel for somebody who is signed in. `useIsSignedIn`
    gets it right on the FIRST render. Third place in this codebase that needed
    the same fix, after the cart badge and the carousel arrows.
  */
  const signedIn = useIsSignedIn()

  const load = useCallback(async (signal?: AbortSignal) => {
    // NOTE the absence of a `setError(null)` here.
    //
    // Clearing the error up-front reads naturally and is a synchronous setState
    // before the first `await` — which, when this runs from an effect, is exactly
    // the cascading render the rule catches. Clearing it on SUCCESS instead is
    // both lint-clean and better behaved: a stale error stays visible while the
    // retry is in flight, rather than the screen going blank and then failing
    // again.
    try {
      // Both in parallel: neither depends on the other, and serialising them
      // doubles the time the page shows a skeleton.
      const [nextCart, nextAddresses] = await Promise.all([
        OrderingService.getCart({ signal }),
        AddressService.list({ signal }).catch(() => [] as Address[]),
      ])
      setCart(nextCart)
      setAddresses(nextAddresses)
      setAddressId(
        (nextAddresses.find((a) => a.is_default) ?? nextAddresses[0])?.id ?? null,
      )
      setError(null)
    } catch (err) {
      // An abort is not a failure — the component went away, and setting state
      // here would be a warning about updating an unmounted tree.
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(messageFor(err, 'Could not load your cart.'))
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    // Nothing to fetch for a signed-out visitor, and nothing to switch off
    // either — `loading` below is derived, so this branch simply does no work.
    if (!signedIn) return
    // Aborted on unmount and on a sign-in change, so navigating away mid-fetch
    // cancels the request rather than resolving into a dead component. This is
    // what threading `signal` through the services bought.
    const controller = new AbortController()
    /*
      eslint-disable-next-line react-hooks/set-state-in-effect --
      The rule cannot see through the async boundary. Every setState in `load`
      happens AFTER an await, so none of them is synchronous with this effect --
      but the rule's analysis stops at the call and flags anything reachable.
      Verified by hand: `load` has no setState before its first await, which is
      why an earlier `setError(null)` at the top of it was moved to the success
      path.

      The rule is still pointing at something real, and the honest fix is not a
      disable: fetching in an effect is the wrong tool. The right answer is a
      data-fetching primitive that owns the loading and error state -- React
      Query, SWR, or `use()` with a cached promise -- which also gets us
      deduplication, background refetch and cache invalidation that this
      hand-rolled version does not have. That is a deliberate next step, not
      something to smuggle in here.
    */
    void load(controller.signal)
    return () => controller.abort()
  }, [signedIn, load])

  async function changeQuantity(lineId: string, next: number) {
    setBusy(true)
    setError(null)
    try {
      setCart(await OrderingService.setQuantity(lineId, next))
    } catch (err) {
      setError(messageFor(err, 'Could not update that.'))
    } finally {
      setBusy(false)
    }
  }

  async function clear() {
    setBusy(true)
    try {
      await OrderingService.clearCart()
      await load()
    } catch (err) {
      setError(messageFor(err, 'Could not empty the cart.'))
    } finally {
      setBusy(false)
    }
  }

  async function placeOrder() {
    if (!addressId) {
      setError('Add a delivery address first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      // Generated ONCE per attempt sequence, here, not inside the service. The
      // key must be stable across retries of the same logical checkout, so a
      // flaky network cannot place two orders.
      const key = OrderingService.newCheckoutKey()
      const result = await OrderingService.checkout(
        { address_id: addressId, payment_method: 'cod' },
        key,
      )
      // `result.order.id`, not `result.order_id` — checkout returns the whole
      // order, not just a reference. Worth the note: the wrong version compiled
      // fine against a guessed type and would have navigated to /orders/undefined.
      router.push(`/orders/${result.order.id}`)
    } catch (err) {
      setError(messageFor(err, 'Could not place the order.'))
      setBusy(false)
    }
    // No `finally`: on success we navigate away, and clearing `busy` would
    // re-enable the button for the moment before the route changes.
  }

  // Derived: only a signed-in visitor has anything to wait for.
  const loading = signedIn && !loaded
  if (loading) return <CartSkeleton />

  if (!signedIn) {
    return (
      <Panel
        title="Sign in to see your cart"
        body="Your cart lives with your account, so it is waiting for you on any device."
      >
        {/* No local flag to clear: signing in fires a session change, the hook
            re-reads it, and this whole branch stops rendering. */}
        <Button onClick={() => void requireAuth('Sign in to see your cart.')}>
          Sign in
        </Button>
      </Panel>
    )
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <Panel
        title="Your cart is empty"
        body="Nothing in here yet. Pick a kitchen and add something you actually want to eat."
        icon
      >
        <Link href="/kitchens">
          <Button>Browse kitchens</Button>
        </Link>
      </Panel>
    )
  }

  const soldOut = cart.lines.filter((l) => !l.is_available)

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Blockers first, before the customer invests attention in the totals. */}
      {!cart.kitchen_open && (
        <p className="rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger" role="status">
          {cart.closed_reason ?? 'This kitchen is closed right now.'} Your cart is
          saved — you can order when it reopens.
        </p>
      )}
      {soldOut.length > 0 && (
        <p className="rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger" role="status">
          {soldOut.map((l) => l.name).join(', ')} sold out after you added{' '}
          {soldOut.length === 1 ? 'it' : 'them'}. Remove to continue.
        </p>
      )}

      <section className="rounded-2xl bg-surface shadow-sm ring-1 ring-rule/70">
        <ul>
          {cart.lines.map((line) => (
            <li
              key={line.line_id}
              className="flex items-start gap-4 border-b border-rule-soft p-4 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-[1.0625rem] font-semibold leading-snug text-ink">
                  {line.name}
                </p>

                {/* What they actually chose. Without this the customer cannot
                    tell a half portion from a full one in their own cart. */}
                {line.modifiers && line.modifiers.length > 0 && (
                  <p className="mt-0.5 text-xs leading-snug text-ink-soft">
                    {line.modifiers.join(' · ')}
                  </p>
                )}

                {/*
                  Derived from the LINE TOTAL, not from `unit_price_minor`.
                  unit_price_minor is the base price and excludes modifiers, so
                  showing it reads as "₹389 each" beside a ₹1,058 line total and
                  makes the arithmetic look broken. This is the number the
                  customer is actually paying per item.
                */}
                <p className="tabular mt-0.5 text-sm text-ink-soft">
                  {formatRupees(Math.round(line.line_total_minor / line.quantity))} each
                </p>
                {!line.is_available && (
                  <p className="mt-1 text-xs font-medium text-danger">Sold out</p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <QuantityStepper
                  quantity={line.quantity}
                  onChange={(n) => changeQuantity(line.line_id, n)}
                  disabled={busy}
                  itemName={line.name}
                />
                <span className="tabular text-sm font-semibold text-ink">
                  {formatRupees(line.line_total_minor)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-rule/70">
        <h2 className="font-display text-base font-bold text-ink">Bill details</h2>
        {/*
          EVERY line shown before payment, which is the promise the home page
          makes ("no surprise fees at the end"). A collapsed "taxes and charges"
          row is the pattern that promise exists to reject.
        */}
        <dl className="mt-3 flex flex-col gap-1.5 text-sm">
          <Row label="Item total" value={cart.subtotal_minor} />
          <Row label="Packaging" value={cart.packaging_fee_minor} />
          <Row label="Delivery" value={cart.delivery_fee_minor} />
          <Row label="GST" value={cart.tax_minor} />
          <div className="mt-1.5 flex items-baseline justify-between border-t border-rule pt-2.5">
            <dt className="font-display font-bold text-ink">To pay</dt>
            <dd className="tabular font-display text-lg font-bold text-ink">
              {formatRupees(cart.total_minor)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-rule/70">
        <h2 className="font-display text-base font-bold text-ink">Deliver to</h2>
        {addresses.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            No saved address yet. Adding one is the next thing to build here — for
            now an order needs an address on the account.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {addresses.map((address) => (
              <li key={address.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ring-1 ring-rule transition-colors hover:bg-surface-sunk">
                  <input
                    type="radio"
                    name="address"
                    value={address.id}
                    checked={addressId === address.id}
                    onChange={() => setAddressId(address.id)}
                    className="mt-1 accent-brand"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {address.label || address.line1}
                    </span>
                    <span className="block truncate text-xs text-ink-soft">
                      {address.line1}, {address.city} {address.pincode}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <p className="rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button
          size="lg"
          fullWidth
          onClick={placeOrder}
          // Every reason it cannot proceed, resolved before the tap rather than
          // as a failed request.
          disabled={busy || !cart.kitchen_open || soldOut.length > 0 || !addressId}
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          Place order &middot; {formatRupees(cart.total_minor)}
        </Button>
        <Button variant="secondary" size="lg" onClick={clear} disabled={busy}>
          <Trash2 className="size-4" />
          Empty cart
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-ink-faint">
        Cash on delivery for now. Online payment is wired on the backend and not
        yet connected here.
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="tabular text-ink">{value === 0 ? 'Free' : formatRupees(value)}</dd>
    </div>
  )
}

function Panel({
  title,
  body,
  icon,
  children,
}: {
  title: string
  body: string
  icon?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-rule-strong px-6 py-12 text-center">
      {icon && <ShoppingBag className="mx-auto size-7 text-ink-faint" aria-hidden="true" />}
      <p className="mt-3 font-display text-lg font-bold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{body}</p>
      <div className="mt-5 flex justify-center">{children}</div>
    </div>
  )
}

function CartSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  )
}

