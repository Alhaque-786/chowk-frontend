'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { QueryProvider } from '@/lib/query'
import { formatRupees } from '@/lib/format'
import { messageFor } from '@/lib/api/errors'
import IdentityService from '@/services/IdentityService'
import OrderingService from '@/services/OrderingService'
import type { Order } from '@/lib/api/types'

/**
 * Order history.
 *
 * A CLIENT COMPONENT even though a list of past orders is exactly the kind of thing
 * this app renders on the server elsewhere. The reason is the token: it lives in
 * localStorage, so a server render has no way to know who is asking. Everything
 * server-rendered here is public — menus, listings, offers — and this is not.
 *
 * Wrapped in its own QueryProvider rather than one at the root layout, so a customer
 * browsing menus never downloads a query client they do not use.
 */
export function OrderHistory() {
  return (
    <QueryProvider>
      <HistoryList />
    </QueryProvider>
  )
}

function HistoryList() {
  const signedIn = IdentityService.isSignedIn()

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: () => OrderingService.listOrders(),
    // Asking for orders while signed out is a guaranteed 401, and the empty state
    // below is a better answer than an error.
    enabled: signedIn,
  })

  if (!signedIn) {
    return (
      <EmptyState
        icon={Receipt}
        title="Sign in to see your orders"
        body="Your order history is tied to your account, so we need to know who you are."
        action={<Link href="/account"><Button>Sign in</Button></Link>}
      />
    )
  }

  if (isPending) return <HistorySkeleton />

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Could not load your orders"
        body={messageFor(error)}
        action={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    )
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No orders yet"
        body="When you order something, it will show up here with its status."
        action={<Link href="/kitchens"><Button>Browse kitchens</Button></Link>}
      />
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((order) => (
        <li key={order.id}>
          <OrderRow order={order} />
        </li>
      ))}
    </ul>
  )
}

function OrderRow({ order }: { order: Order }) {
  return (
    <Link
      href={`/orders/${order.id}`}
      className="block rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-rule transition-shadow hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{order.number}</p>
          <p className="mt-0.5 text-xs text-ink-faint">
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {' · '}
            {/* The item count, not the line count: those differ the moment somebody
                orders two of anything, and this should match what arrived. */}
            {order.lines.reduce((n, l) => n + l.quantity, 0)} item
            {order.lines.reduce((n, l) => n + l.quantity, 0) === 1 ? '' : 's'}
          </p>
        </div>
        <div className="text-right">
          <p className="tabular font-bold text-ink">{formatRupees(order.total_minor)}</p>
          <p className="mt-0.5 text-xs capitalize text-ink-soft">
            {order.status.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      {order.lines.length > 0 && (
        <p className="mt-2 truncate border-t border-rule pt-2 text-sm text-ink-soft">
          {order.lines.map((l) => l.name).join(', ')}
        </p>
      )}
    </Link>
  )
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 rounded-2xl bg-surface shadow-sm ring-1 ring-rule" />
      ))}
    </div>
  )
}
