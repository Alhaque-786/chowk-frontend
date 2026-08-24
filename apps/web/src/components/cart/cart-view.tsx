'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Loader2, LogIn, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CartLines, CartTotals } from './cart-lines'
import { AddressSheet } from '@/components/account/address-sheet'
import PromotionService from '@/services/PromotionService'
import { cn } from '@/lib/cn'
import { EmptyState } from '@/components/ui/empty-state'
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
  const [addingAddress, setAddingAddress] = useState(false)

  /*
    TWO pieces of coupon state, deliberately.

    `coupon` is what is typed. `appliedCoupon` is what the SERVER accepted. Keeping
    them apart is what stops a typed-but-unvalidated code being sent to checkout —
    and it means clearing the input does not silently un-apply a working discount.

    The check is advisory either way: the authoritative one happens inside the
    checkout transaction, because a coupon's global cap can be exhausted between
    validating it and placing the order.
  */
  const [coupon, setCoupon] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponNote, setCouponNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)

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

  /**
   * Validates a code against this cart, without applying it server-side.
   *
   * `POST /offers/check` is ADVISORY — it returns whether the code would work and
   * what it would take off, and the authoritative evaluation happens inside the
   * checkout transaction. So this stores the code and shows the expected discount;
   * it never claims the discount has been granted.
   *
   * That distinction is in the copy on purpose: "the discount is calculated when
   * you place the order" is true, whereas showing a reduced total here would be a
   * promise this endpoint cannot make.
   */
  async function applyCoupon() {
    const code = coupon.trim().toUpperCase()
    if (code === '' || !cart?.kitchen_id) return

    setCheckingCoupon(true)
    setCouponNote(null)
    try {
      const result = await PromotionService.checkCode(
        code,
        cart.kitchen_id,
        // The subtotal the coupon is priced against. Without it the server sees an
        // order worth nothing and rejects every code as "cart is empty".
        cart.subtotal_minor,
      )
      if (result.valid) {
        setAppliedCoupon(result.code ?? code)
        setCouponNote({
          ok: true,
          text: result.discount_minor > 0
            ? `${formatRupees(result.discount_minor)} off with ${result.code ?? code}.`
            : `${result.code ?? code} applied.`,
        })
      } else {
        // The server's `reason` is written for customers and says WHY — "add ₹50
        // more", "first order only". Replacing it with "invalid code" would throw
        // away the only actionable part.
        setCouponNote({ ok: false, text: result.reason ?? 'That code does not apply here.' })
      }
    } catch (err) {
      setCouponNote({ ok: false, text: messageFor(err, 'Could not check that code.') })
    } finally {
      setCheckingCoupon(false)
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
        {
          address_id: addressId,
          payment_method: 'cod',
          // Only a code the server accepted. A typed-but-unchecked one would be
          // rejected at checkout and lose the whole order to a typo.
          ...(appliedCoupon ? { coupon_code: appliedCoupon } : {}),
        },
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
      <EmptyState
        className="mt-6"
        icon={LogIn}
        title="Sign in to see your cart"
        body="Your cart lives with your account, so it is waiting for you on any device."
        action={
          // No local flag to clear: signing in fires a session change, the hook
          // re-reads it, and this whole branch stops rendering.
          <Button onClick={() => void requireAuth('Sign in to see your cart.')}>
            Sign in
          </Button>
        }
      />
    )
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <EmptyState
        className="mt-6"
        icon={ShoppingBag}
        title="Your cart is empty"
        body="Nothing in here yet. Pick a kitchen and add something you actually want to eat."
        action={
          <Link href="/kitchens">
            <Button>Browse kitchens</Button>
          </Link>
        }
      />
    )
  }

  const soldOut = cart.lines.filter((l) => !l.is_available)

  return (
    <div className="mt-6 flex flex-col gap-6">
      {addingAddress && (
        <AddressSheet
          open
          onOpenChange={setAddingAddress}
          // The first address becomes the default, so the next order needs no
          // choice at all.
          makeDefault={addresses.length === 0}
          onSaved={(saved) => {
            setAddresses((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)])
            // Selected immediately: somebody who just added an address is
            // plainly telling you where they want this order sent.
            setAddressId(saved.id)
          }}
        />
      )}
      {/* Mounted only while open, so the form's state resets between uses rather
          than remembering a half-filled address from last time. */}
      {addingAddress && (
        <AddressSheet
          open
          onOpenChange={setAddingAddress}
          // The first address becomes the default, so the next order needs no
          // choice at all.
          makeDefault={addresses.length === 0}
          onSaved={(saved) => {
            setAddresses((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)])
            // Selected immediately: somebody who just added an address is plainly
            // telling you where they want this order sent.
            setAddressId(saved.id)
          }}
        />
      )}

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
        <CartLines cart={cart} onQuantityChange={changeQuantity} busy={busy} />
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-rule/70">
        <h2 className="font-display text-base font-bold text-ink">Bill details</h2>
        {/*
          EVERY line shown before payment, which is the promise the home page
          makes ("no surprise fees at the end"). A collapsed "taxes and charges"
          row is the pattern that promise exists to reject.
        */}
        <div className="mt-3">
          <CartTotals cart={cart} />
        </div>
      </section>

      {/*
        Coupon entry.

        A manual field as well as the offers list, because the two serve different
        people: somebody who was sent a code by a friend has nothing to tap. The
        code is uppercased on the way in — the API matches case-insensitively, but
        showing it lowercase makes people wonder whether it took.
      */}
      <section className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-rule/70">
        <h2 className="font-display text-base font-bold text-ink">Have a code?</h2>

        {appliedCoupon ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-veg/10 px-3.5 py-3 ring-1 ring-veg/25">
            <span className="flex min-w-0 items-center gap-2">
              <BadgeCheck className="size-4 shrink-0 text-veg" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-display text-sm font-bold tracking-wide text-ink">
                  {appliedCoupon}
                </span>
                <span className="block text-xs text-ink-soft">
                  Applied. The discount is calculated when you place the order.
                </span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setAppliedCoupon(null)
                setCouponNote(null)
                setCoupon('')
              }}
              className="shrink-0 text-sm font-semibold text-brand hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void applyCoupon()
            }}
          >
            <label htmlFor="coupon" className="sr-only">
              Coupon code
            </label>
            <input
              id="coupon"
              value={coupon}
              onChange={(e) => {
                setCoupon(e.target.value.toUpperCase())
                setCouponNote(null)
              }}
              placeholder="WELCOME50"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="tabular h-11 min-w-0 flex-1 rounded-xl border border-rule-strong bg-surface px-3.5 text-sm uppercase tracking-wide text-ink outline-none transition-colors placeholder:tracking-normal placeholder:text-ink-faint focus:border-brand/50"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={checkingCoupon || coupon.trim() === ''}
            >
              {checkingCoupon && <Loader2 className="size-4 animate-spin" />}
              Apply
            </Button>
          </form>
        )}

        {couponNote && (
          <p
            className={cn(
              'mt-2 text-sm',
              couponNote.ok ? 'text-veg' : 'text-danger',
            )}
            // Announced: the customer pressed Apply and the answer appears
            // somewhere other than where they were looking.
            role="status"
          >
            {couponNote.text}
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-rule/70">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-bold text-ink">Deliver to</h2>
          {addresses.length > 0 && (
            <button
              type="button"
              onClick={() => setAddingAddress(true)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              <Plus className="size-3.5" />
              Add new
            </button>
          )}
        </div>

        {addresses.length === 0 ? (
          <EmptyState
            tone="plain"
            className="px-0 py-6"
            title="No delivery address yet"
            body="We need somewhere to send it. This takes about twenty seconds."
            action={
              <Button onClick={() => setAddingAddress(true)}>
                <Plus className="size-4" />
                Add an address
              </Button>
            }
          />
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



function CartSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  )
}

