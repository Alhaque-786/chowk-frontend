'use client'

import { Require } from '@/components/auth/require'
import { OrderQueue } from '@/components/queue/order-queue'
import { QueryProvider } from '@/lib/query'
import KitchenService from '@/services/KitchenService'

const source = {
  key: 'kitchen',
  queue: () => KitchenService.queue(),
  transition: (orderId: string, action: Parameters<typeof KitchenService.transition>[1], reason?: string) =>
    KitchenService.transition(orderId, action, reason),
}

/**
 * The kitchen's own queue.
 *
 * The gate below is navigation, not security — see components/auth/require.tsx. Its
 * job is to tell somebody who landed here by accident what is wrong, rather than
 * show them an empty queue that reads as "no orders" when it means "wrong account".
 * The endpoints refuse on their own; that is the part that matters.
 */
export function KitchenDashboard() {
  return (
    <Require
      capability="kitchen.queue.view"
      requiresKitchen
      denied={{
        title: 'This is the kitchen dashboard',
        body: 'Your account is not a kitchen account. If you manage a kitchen on Chowk, sign in with the account we set up for it.',
      }}
    >
      <p className="mb-4 text-sm text-ink-soft">
        Oldest first, so the top of the list is what has been waiting longest. Refreshes
        on its own every 15 seconds.
      </p>

      <QueryProvider>
        <OrderQueue
          source={source}
          emptyTitle="Nothing to cook right now"
          emptyBody="New orders appear here as soon as customers place them."
        />
      </QueryProvider>
    </Require>
  )
}
