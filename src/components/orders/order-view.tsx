'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRupees } from '@/lib/format'
import { messageFor } from '@/lib/api/errors'
import OrderingService from '@/services/OrderingService'
import type { Order, OrderStatus } from '@/lib/api/types'
import { cn } from '@/lib/cn'

/**
 * The stages a customer is shown, in order.
 *
 * A CURATED subset of the backend's state machine, not a mirror of it. The
 * backend distinguishes states the kitchen cares about; a customer only wants to
 * know how far along their food is. Statuses not listed here — rejected,
 * cancelled, refunded — are terminal and get their own banner rather than a
 * position on this line, because a progress bar implies forward motion.
 */
const STAGES: Array<{ status: OrderStatus; label: string }> = [
  { status: 'placed', label: 'Placed' },
  { status: 'confirmed', label: 'Accepted' },
  { status: 'preparing', label: 'Cooking' },
  { status: 'ready', label: 'Ready' },
  { status: 'picked_up', label: 'On the way' },
  { status: 'delivered', label: 'Delivered' },
]

/** How often to re-read while the order is live. */
const POLL_MS = 15_000

const TERMINAL: OrderStatus[] = ['delivered', 'cancelled', 'rejected', 'refunded']

export function OrderView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null)
  // Derived below, for the same reason as in the cart: a "has it finished" flag
  // is only ever set from the async path, so nothing needs setState in an effect.
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setOrder(
        await OrderingService.getOrder(orderId, {
          signal,
          // No retry: this runs on a 15-second poll, so the NEXT TICK is already
          // the retry. Retrying inside a poll just stacks requests on a server
          // that is already struggling.
          retry: false,
          // Shorter than the default: a status read that has not answered in 8
          // seconds is stale anyway, and the next tick is 7 seconds away.
          timeoutMs: 8_000,
        }),
      )
      setError(null)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(messageFor(err, 'Could not load this order.'))
    } finally {
      setLoaded(true)
    }
  }, [orderId])

  useEffect(() => {
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
  }, [load])

  /*
    Polling, not a websocket, and that is a deliberate stage-appropriate choice.
    A websocket means connection lifecycle, reconnect-with-backoff, and sticky
    routing once there is more than one server. A 15-second poll on a page
    somebody watches for twenty minutes is a handful of requests, and it stops
    entirely once the order is terminal — so the cost is bounded by the order,
    not by how long the tab stays open.
  */
  useEffect(() => {
    if (!order || TERMINAL.includes(order.status)) return
    const controller = new AbortController()
    const timer = setInterval(() => { void load(controller.signal) }, POLL_MS)
    return () => {
      clearInterval(timer)
      // Abort the in-flight poll too, not just the timer: clearing the interval
      // alone leaves the last request running and resolving into nothing.
      controller.abort()
    }
  }, [order, load])

  async function cancel() {
    setCancelling(true)
    try {
      setOrder(await OrderingService.cancelOrder(orderId))
    } catch (err) {
      setError(
        messageFor(err, 'Could not cancel the order.'),
      )
    } finally {
      setCancelling(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="rounded-2xl border border-dashed border-rule-strong px-6 py-12 text-center">
        <p className="font-display text-lg font-bold text-ink">Order not found</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          {error ?? 'We could not find that order on your account.'}
        </p>
        <Link href="/kitchens" className="mt-5 inline-block text-sm font-semibold text-brand hover:underline">
          Browse kitchens →
        </Link>
      </div>
    )
  }

  const stageIndex = STAGES.findIndex((s) => s.status === order.status)
  const stopped = ['cancelled', 'rejected', 'refunded'].includes(order.status)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          {order.status === 'delivered' ? 'Delivered' : 'Order placed'}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {order.number}
        </h1>
        {order.promised_at && !stopped && order.status !== 'delivered' && (
          <p className="mt-1.5 text-sm text-ink-soft">
            Expected by{' '}
            <strong className="font-semibold text-ink">
              {new Date(order.promised_at).toLocaleTimeString('en-IN', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </strong>
          </p>
        )}
      </header>

      {stopped ? (
        <p className="rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger" role="status">
          This order was {order.status}. Anything already charged is refunded
          automatically.
        </p>
      ) : (
        // Progress as a list, not a decorative bar: a screen reader gets the
        // stage names and which one is current, which a styled div would not give.
        <ol className="flex flex-col gap-0">
          {STAGES.map((stage, i) => {
            const done = i <= stageIndex
            const current = i === stageIndex
            return (
              <li key={stage.status} className="flex items-start gap-3">
                <span className="flex flex-col items-center self-stretch">
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold',
                      done ? 'bg-veg text-on-veg' : 'bg-surface-sunk text-ink-faint',
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  {i < STAGES.length - 1 && (
                    <span
                      className={cn('w-px flex-1', done ? 'bg-veg' : 'bg-rule')}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className={cn('pb-5 text-sm', current ? 'font-semibold text-ink' : 'text-ink-soft')}>
                  {stage.label}
                  {current && <span className="ml-2 text-xs text-accent">now</span>}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      <section className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-rule/70">
        <h2 className="font-display text-base font-bold text-ink">What you ordered</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {order.lines.map((line, i) => (
            <li key={`${line.name}-${i}`} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-ink">
                <span className="tabular text-ink-faint">{line.quantity}&times;</span>{' '}
                {line.name}
              </span>
              <span className="tabular shrink-0 text-ink">
                {formatRupees(line.line_total_minor)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 flex flex-col gap-1.5 border-t border-rule pt-3 text-sm">
          <Row label="Item total" value={order.subtotal_minor} />
          <Row label="Packaging" value={order.packaging_fee_minor} />
          <Row label="Delivery" value={order.delivery_fee_minor} />
          {order.discount_minor > 0 && (
            <Row label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}`} value={-order.discount_minor} />
          )}
          <Row label="GST" value={order.tax_minor} />
          <div className="mt-1.5 flex items-baseline justify-between border-t border-rule pt-2.5">
            <dt className="font-display font-bold text-ink">
              {order.payment_method === 'cod' ? 'Pay on delivery' : 'Paid'}
            </dt>
            <dd className="tabular font-display text-lg font-bold text-ink">
              {formatRupees(order.total_minor)}
            </dd>
          </div>
        </dl>
      </section>

      {order.delivery_address && (
        <section className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-rule/70">
          <h2 className="font-display text-base font-bold text-ink">Delivering to</h2>
          <p className="mt-1.5 text-sm text-ink-soft">{order.delivery_address}</p>
        </section>
      )}

      {error && (
        <p className="rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {/* `can_cancel` is the SERVER's ruling, never inferred from status here —
          whether cancelling is allowed depends on the order state machine, and
          duplicating that rule on the client is how the two drift apart. */}
      {order.can_cancel && (
        <Button variant="secondary" onClick={cancel} disabled={cancelling}>
          {cancelling && <Loader2 className="size-4 animate-spin" />}
          Cancel this order
        </Button>
      )}

      <Link href="/kitchens" className="text-sm font-semibold text-brand hover:underline">
        Order something else →
      </Link>
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="tabular text-ink">
        {value === 0 ? 'Free' : formatRupees(value)}
      </dd>
    </div>
  )
}
