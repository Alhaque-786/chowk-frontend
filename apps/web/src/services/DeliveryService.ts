import { api, type CallOptions } from '@/lib/api/client'

/** Where the delivery has got to. Mirrors the backend's delivery.Status. */
export type DeliveryStatus =
  | 'requested'
  | 'assigned'
  | 'at_pickup'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'
  | 'failed'

export type Delivery = {
  status: DeliveryStatus
  mode: string
  rider_name?: string
  rider_phone?: string
  /** The provider's own live-tracking page, when there is one. */
  tracking_url?: string
  /** ISO timestamp. Absent when nobody can honestly estimate yet. */
  drop_eta?: string
  failure_reason?: string
}

/**
 * The delivery behind an order.
 *
 * A SEPARATE REQUEST from the order itself, matching the backend's separate
 * module. An order exists long before a delivery does — while the kitchen is
 * cooking there is no rider and nothing to show — so folding this into the order
 * response would mean most reads carrying a null field, and the order endpoint
 * knowing about riders.
 *
 * A 404 here is the ordinary state, not an error: no rider has been assigned yet.
 * Callers should treat "not found" as "not yet".
 */
const DeliveryService = {
  forOrder: async (orderId: string, options?: CallOptions): Promise<Delivery> =>
    api.get<Delivery>(`/deliveries/by-order/${orderId}`, {
      // Shorter than the default. This is supporting detail on a page that has
      // already rendered; a slow answer should give up rather than hold the rest
      // of the order page's polling behind it.
      timeoutMs: 6_000,
      ...options,
    }),
}

export default DeliveryService
