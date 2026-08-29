'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { formatRupees } from '@/lib/format'
import { messageFor } from '@/lib/api/errors'
import type { KitchenAction } from '@/services/KitchenService'
import type { Order, OrderStatus } from '@/lib/api/types'
import { cn } from '@/lib/cn'

/**
 * The order queue, shared by the kitchen dashboard and the platform ops console.
 *
 * ONE COMPONENT FOR BOTH because they are the same screen doing the same job — a
 * list of orders and the next action on each. What differs is WHO is acting and
 * which endpoint that hits, and both of those are injected. Building two would mean
 * fixing every future queue bug twice, and the second copy is always the one that
 * gets missed.
 *
 * NOT A REALTIME FEED, deliberately, and this is the honest trade. A kitchen queue
 * wants a websocket; that needs a subscription endpoint the backend does not have,
 * plus reconnection handling and a fallback for when it drops. Polling every 15
 * seconds is a worse experience and an order of magnitude less to get wrong, so it
 * is what ships until the endpoint exists. The refresh button is there because 15
 * seconds is a long time when a customer is standing in front of you.
 */

/** What a queue can do, so the two dashboards differ only in their transport. */
export type QueueSource = {
  /** Distinguishes cache entries. The kitchen queue and the ops queue return
   *  different orders to different people and must not share one. */
  key: string
  queue: () => Promise<Order[]>
  transition: (orderId: string, action: KitchenAction, reason?: string) => Promise<Order>
}

/**
 * The single next action for each status.
 *
 * A map rather than buttons for every transition, because a queue with six buttons
 * per card is a queue where somebody taps "delivered" on food that has not been
 * cooked. The state machine allows more than this; the UI offers what comes next.
 */
const NEXT: Partial<Record<OrderStatus, { action: KitchenAction; label: string }>> = {
  placed: { action: 'accept', label: 'Accept' },
  confirmed: { action: 'start', label: 'Start preparing' },
  preparing: { action: 'ready', label: 'Mark ready' },
  ready: { action: 'handover', label: 'Hand to rider' },
  picked_up: { action: 'delivered', label: 'Mark delivered' },
}

const POLL_MS = 15_000

export function OrderQueue({
  source,
  emptyTitle,
  emptyBody,
}: {
  source: QueueSource
  emptyTitle: string
  emptyBody: string
}) {
  const client = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)

  /*
    POLLED, not subscribed. A kitchen queue wants a websocket; that needs a
    subscription endpoint the backend does not have, plus reconnection handling and
    a fallback for when it drops. Fifteen seconds is a worse experience and an order
    of magnitude less to get wrong, so it ships until the endpoint exists.

    `queryKey` includes the source's own key so the kitchen queue and the ops queue
    do not share a cache entry — they return different orders to different people.
  */
  const {
    data: orders,
    error,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['order-queue', source.key],
    queryFn: () => source.queue(),
    refetchInterval: POLL_MS,
    // The previous list stays on screen while a refetch fails, so a blip does not
    // empty a kitchen's screen mid-service and make them think orders vanished.
    placeholderData: (previous) => previous,
  })

  const act = useMutation({
    mutationFn: ({ order, action, reason }: { order: Order; action: KitchenAction; reason?: string }) =>
      source.transition(order.id, action, reason),
    onSuccess: () => {
      setActionError(null)
      // Invalidate rather than patching the local copy. A transition may have
      // side effects this component cannot see — a rider dispatched, a payment
      // captured — and guessing at them is how a queue starts disagreeing with
      // reality.
      void client.invalidateQueries({ queryKey: ['order-queue', source.key] })
    },
    onError: (e) => setActionError(messageFor(e)),
  })

  function onAct(order: Order, action: KitchenAction) {
    // A rejection needs a reason and the API enforces it, so ask rather than send a
    // request we know will fail.
    let reason: string | undefined
    if (action === 'reject') {
      const entered = window.prompt('Why is this order being rejected?')
      if (!entered) return
      reason = entered
    }
    act.mutate({ order, action, reason })
  }

  const shownError = actionError ?? (error ? messageFor(error) : null)

  if (!orders && error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Could not load the queue"
        body={messageFor(error)}
        action={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    )
  }

  if (isPending || !orders) {
    return <QueueSkeleton />
  }

  return (
    <div className="flex flex-col gap-4">
      {shownError && (
        // Shown ABOVE a list that is still usable: the orders on screen are real,
        // they are just possibly a few seconds stale.
        <p role="status" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {shownError} — showing the last successful load.
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-ink-soft">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'} in the queue
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={Clock} title={emptyTitle} body={emptyBody} />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <QueueCard
              key={order.id}
              order={order}
              busy={act.isPending && act.variables?.order.id === order.id}
              onAct={(action) => onAct(order, action)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function QueueCard({
  order,
  busy,
  onAct,
}: {
  order: Order
  busy: boolean
  onAct: (action: KitchenAction) => void
}) {
  const next = NEXT[order.status]

  return (
    <li className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-rule">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold tracking-[-0.01em] text-ink">
            {order.number}
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            {new Date(order.created_at).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {' · '}
            {/* Payment method belongs on the card: a cash order means the rider
                collects, which changes what the kitchen hands over. */}
            {order.payment_method === 'cod' ? 'Cash on delivery' : 'Paid online'}
          </p>
        </div>
        <StatusPill status={order.status} />
      </div>

      <ul className="mt-3 flex flex-col gap-1 border-t border-rule pt-3">
        {order.lines.map((line, i) => (
          // OrderLine carries no id of its own — menu_item_id is optional and two
          // lines can share it with different modifiers, so position is the only
          // stable key available. Safe here: the list is never reordered locally,
          // it is replaced wholesale by a refetch.
          <li key={line.menu_item_id ?? i} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 text-ink">
              {/* Quantity first and in bold: it is the thing a cook misreads. */}
              <span className="font-bold tabular">{line.quantity}×</span>{' '}
              <span className="truncate">{line.name}</span>
            </span>
            <span className="shrink-0 tabular text-xs text-ink-faint">
              {formatRupees(line.line_total_minor)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3">
        <p className="tabular text-sm font-bold text-ink">{formatRupees(order.total_minor)}</p>
        <div className="flex items-center gap-2">
          {/* Rejecting stays available until the food is being cooked. After that the
              ingredients are spent and the answer is a cancellation with a refund
              decision, which is not a queue action. */}
          {(order.status === 'placed' || order.status === 'confirmed') && (
            <Button variant="secondary" onClick={() => onAct('reject')} disabled={busy}>
              Reject
            </Button>
          )}
          {next && (
            <Button onClick={() => onAct(next.action)} disabled={busy}>
              {busy ? 'Working…' : next.label}
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}

/** Colour carries the same meaning as the label, for anyone scanning rather than reading. */
function StatusPill({ status }: { status: OrderStatus }) {
  const tone =
    status === 'placed'
      ? 'bg-accent-soft text-accent'
      : status === 'ready' || status === 'picked_up'
        ? 'bg-veg/10 text-veg'
        : 'bg-brand-soft text-brand'

  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
        tone,
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function QueueSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 rounded-2xl bg-surface shadow-sm ring-1 ring-rule" />
      ))}
    </div>
  )
}
