import { api, newIdempotencyKey, type CallOptions } from '@/lib/api/client'
import type { Order } from '@/lib/api/types'
import type { KitchenAction } from '@/services/KitchenService'

/**
 * The platform's own order queue, for vendors who cannot action their own.
 *
 * An assisted vendor — a cart selling fresh nariyal pani is the case this exists
 * for — has no dashboard and never signs in. Without this screen his orders sit at
 * `placed` until they time out and the customer is told the kitchen never
 * responded.
 *
 * SEPARATE FROM KitchenService, mirroring the backend's separate mount. The kitchen
 * routes refuse a caller with no kitchen scope, and that same check is what stops
 * one kitchen touching another's order. These routes have no kitchen scope at all
 * and are gated on platform_admin instead. Two surfaces, two authority models,
 * neither able to drift into the other.
 *
 * Spans every assisted vendor at once rather than one outlet, because an agent
 * works a phone-call queue, not a kitchen pass.
 */
const OpsService = {
  queue: async (options?: CallOptions): Promise<Order[]> => {
    const res = await api.get<{ orders: Order[] }>('/admin/ops/queue', {
      timeoutMs: 8_000,
      ...options,
    })
    return res.orders ?? []
  },

  /**
   * Advances an order on the vendor's behalf.
   *
   * The kitchen is derived from the ORDER server-side, not sent from here. An agent
   * names an order; he cannot name a kitchen and act on it.
   */
  transition: async (
    orderId: string,
    action: KitchenAction,
    reason?: string,
    options?: CallOptions,
  ): Promise<Order> =>
    api.post<Order>(
      `/admin/ops/orders/${orderId}/${action}`,
      reason ? { reason } : {},
      { timeoutMs: 15_000, ...options, idempotencyKey: newIdempotencyKey() },
    ),
}

export default OpsService
