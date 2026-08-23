import { api, newIdempotencyKey, type CallOptions } from '@/lib/api/client'
import { setCartCount } from '@/lib/cart-store'
import type { Cart, CheckoutResult, Order, PaymentMethod } from '@/lib/api/types'

/**
 * Cart, checkout and order tracking — the `ordering` backend module.
 *
 * THE CART LIVES ON THE SERVER, in Redis, keyed by user. Every method here is a
 * round trip, and none of them mutates a local copy as the source of truth. That
 * is not an oversight: a client-authoritative cart drifts from server prices the
 * moment a kitchen edits a menu, and the customer finds out at the payment
 * screen. The badge count mirrored into `cart-store` is cosmetic and documented
 * as such.
 *
 * Mutations are not cache-wrapped. `getOrder` is not either — an order's status
 * is the one thing on the page that must never be a stale read.
 *
 * EVERY method takes `options` last, and spreads it AFTER this service's own
 * defaults. That ordering is the whole contract:
 *
 *     { timeoutMs: 30_000, retry: 5, ...options, idempotencyKey }
 *       └─ sensible default   └─ caller wins   └─ never overridable
 *
 * So a call site gets the right behaviour for free — checkout is patient and
 * retried, a status poll is not — while a caller who knows better can still say
 * `{ timeoutMs: 60_000 }` or `{ retry: false }`. What a caller may NOT override
 * is anything load-bearing for correctness, which is why `idempotencyKey` is
 * spread last: an accidental `options.idempotencyKey` cannot displace the real
 * one and turn a retry into a second order.
 *
 * The badge tracks `item_count`, not `lines.length`. Those differ the moment
 * somebody orders two of anything, and the count in the corner of the screen
 * should match the number of things being delivered.
 */
const OrderingService = {
  getCart: async (options?: CallOptions): Promise<Cart> => {
    const cart = await api.get<Cart>('/cart', options)
    setCartCount(cart.item_count ?? 0)
    return cart
  },

  addToCart: async (
    input: {
      kitchen_id: string
      menu_item_id: string
      quantity: number
      modifier_ids?: string[]
      note?: string
    },
    options?: CallOptions,
  ): Promise<Cart> => {
    const cart = await api.post<Cart>('/cart/items', input, options)
    setCartCount(cart.item_count ?? 0)
    return cart
  },

  /** Sets an absolute quantity, not a delta. Quantity 0 removes the line.
   *
   *  Absolute deliberately: a delta sent twice by a retrying network adds the
   *  item twice, and the stepper is exactly the control a flaky connection makes
   *  someone tap repeatedly. */
  setQuantity: async (
    lineId: string,
    quantity: number,
    options?: CallOptions,
  ): Promise<Cart> => {
    const cart = await api.patch<Cart>(`/cart/items/${lineId}`, { quantity }, options)
    setCartCount(cart.item_count ?? 0)
    return cart
  },

  clearCart: async (options?: CallOptions): Promise<void> => {
    await api.delete('/cart', options)
    setCartCount(0)
  },

  /**
   * Places the order.
   *
   * `idempotencyKey` is a PARAMETER, not generated in here, and that is the whole
   * point of the mechanism. The key must be stable across retries of the same
   * logical checkout, so the screen generates one when the customer opens the
   * payment sheet and passes the same one on every attempt. Generating it inside
   * this method would give each retry a fresh key and let a flaky network place
   * two orders.
   */
  checkout: async (
    input: {
      address_id: string
      payment_method: PaymentMethod
      coupon_code?: string
      note?: string
    },
    idempotencyKey: string,
    options?: CallOptions,
  ): Promise<CheckoutResult> => {
    const result = await api.post<CheckoutResult>('/checkout', input, {
      // 30s, double the default. Checkout is the slowest write in the system: it
      // prices the order, reserves stock under row locks, writes an outbox event
      // and may call a payment gateway. Timing it out at 15s would abandon work
      // the server is still doing.
      timeoutMs: 30_000,
      // Five attempts, above the default three. Losing a placed order to a flaky
      // moment is the worst failure this app has, and the idempotency key makes
      // the retries free of duplicate-order risk — that is precisely what the key
      // is for.
      retry: 5,
      ...options,
      // Last, deliberately: correctness is not the caller's to override.
      idempotencyKey,
    })
    // The server cart is consumed by a successful checkout, so the badge must
    // not keep showing its old count.
    setCartCount(0)
    return result
  },

  /** Fresh idempotency key for one checkout attempt sequence. Call once per
   *  payment sheet, never per retry. */
  newCheckoutKey: (): string => newIdempotencyKey(),

  /** Options forwarded so a polling caller can abort the in-flight read when the
   *  component unmounts, rather than resolving into a dead component. */
  getOrder: async (orderId: string, options?: CallOptions): Promise<Order> =>
    api.get<Order>(`/orders/${orderId}`, options),

  /** Cancels an order. The backend enforces whether the state machine still
   *  allows it — this will throw ApiError if the kitchen has started cooking. */
  cancelOrder: async (
    orderId: string,
    reason?: string,
    options?: CallOptions,
  ): Promise<Order> =>
    api.post<Order>(`/orders/${orderId}/cancel`, { reason: reason ?? '' }, options),
}

export default OrderingService
