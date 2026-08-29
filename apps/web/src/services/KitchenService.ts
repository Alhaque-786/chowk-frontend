import { api, newIdempotencyKey, type CallOptions } from '@/lib/api/client'
import type { Order } from '@/lib/api/types'

/**
 * The merchant's own order queue — the `ordering` module's kitchen routes.
 *
 * This is the surface without which a merchant on the platform cannot operate:
 * orders arrive and nobody can accept them. It was missing entirely.
 *
 * SCOPED BY THE TOKEN, not by an argument. Every endpoint here derives the kitchen
 * from the caller's access token, which is why none of these methods takes a
 * kitchenId — passing one would imply a choice the API does not offer, and the
 * backend refuses with NO_KITCHEN_SCOPE when the token carries none.
 *
 * NOT CACHED, and that is the whole point of the queue. A stale order list is a
 * customer waiting while the kitchen looks at a page from ninety seconds ago.
 * Transitions carry an idempotency key because staff double-tap buttons on a
 * tablet in a hot kitchen, and the second tap must not be a second state change.
 */

/** The transitions a kitchen can make, in the order they happen. */
export type KitchenAction =
  | 'accept'
  | 'start'
  | 'ready'
  | 'handover'
  | 'delivered'
  | 'reject'

const KitchenService = {
  /** Orders needing attention: placed through picked-up, oldest first. */
  queue: async (options?: CallOptions): Promise<Order[]> => {
    const res = await api.get<{ orders: Order[] }>('/kitchen/queue', {
      // Short, because this is polled. A queue that hangs for fifteen seconds is
      // worse than one that fails fast and retries.
      timeoutMs: 8_000,
      ...options,
    })
    return res.orders ?? []
  },

  /**
   * Advances an order.
   *
   * `reason` is required by the API for a rejection and pointless otherwise. Passed
   * through rather than validated here: the server owns that rule and duplicating
   * it would give two places to keep in step.
   */
  transition: async (
    orderId: string,
    action: KitchenAction,
    reason?: string,
    options?: CallOptions,
  ): Promise<Order> =>
    api.post<Order>(
      `/kitchen/orders/${orderId}/${action}`,
      reason ? { reason } : {},
      {
        timeoutMs: 15_000,
        ...options,
        // Never overridable: a retried tap must not become a second transition.
        idempotencyKey: newIdempotencyKey(),
      },
    ),
}

export default KitchenService
