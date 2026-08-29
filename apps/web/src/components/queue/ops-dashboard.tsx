'use client'

import { Require } from '@/components/auth/require'
import { OrderQueue } from '@/components/queue/order-queue'
import { QueryProvider } from '@/lib/query'
import OpsService from '@/services/OpsService'
import type KitchenService from '@/services/KitchenService'

const source = {
  key: 'ops',
  queue: () => OpsService.queue(),
  transition: (orderId: string, action: Parameters<typeof KitchenService.transition>[1], reason?: string) =>
    OpsService.transition(orderId, action, reason),
}

/**
 * Orders at vendors who cannot action them.
 *
 * Note that the queue itself is the SAME component as the kitchen's. They are the
 * same screen doing the same job — a list of orders and the next action on each —
 * and only the transport differs. Two copies would mean fixing every future queue
 * bug twice, and the second copy is always the one that gets missed.
 */
export function OpsDashboard() {
  return (
    <Require
      capability="ops.orders.act"
      denied={{
        title: 'Platform staff only',
        body: 'This queue actions orders on behalf of vendors, so it is limited to platform accounts.',
      }}
    >
      <p className="mb-4 text-sm text-ink-soft">
        Orders at vendors we operate for. Ring the vendor, then accept or reject on
        their behalf — accepting is what charges the customer.
      </p>

      <QueryProvider>
        <OrderQueue
          source={source}
          emptyTitle="No orders waiting"
          emptyBody="Orders at assisted vendors appear here the moment they are placed."
        />
      </QueryProvider>
    </Require>
  )
}
