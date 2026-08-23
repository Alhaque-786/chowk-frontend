import { newIdempotencyKey, request } from '@/lib/api/client'
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
 */
const OrderingService = {
  getCart: async (): Promise<Cart> => {
    const cart = await request<Cart>('/cart')
    setCartCount(cart.lines?.length ?? 0)
    return cart
  },

  addToCart: async (input: {
    kitchen_id: string
    menu_item_id: string
    quantity: number
    modifier_ids?: string[]
    note?: string
  }): Promise<Cart> => {
    const cart = await request<Cart>('/cart/items', { method: 'POST', body: input })
    setCartCount(cart.lines?.length ?? 0)
    return cart
  },

  /** Sets an absolute quantity, not a delta. Quantity 0 removes the line.
   *
   *  Absolute deliberately: a delta sent twice by a retrying network adds the
   *  item twice, and the stepper is exactly the control a flaky connection makes
   *  someone tap repeatedly. */
  setQuantity: async (lineId: string, quantity: number): Promise<Cart> => {
    const cart = await request<Cart>(`/cart/items/${lineId}`, {
      method: 'PATCH',
      body: { quantity },
    })
    setCartCount(cart.lines?.length ?? 0)
    return cart
  },

  clearCart: async (): Promise<void> => {
    await request<unknown>('/cart', { method: 'DELETE' })
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
  ): Promise<CheckoutResult> => {
    const result = await request<CheckoutResult>('/checkout', {
      method: 'POST',
      body: input,
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

  getOrder: async (orderId: string): Promise<Order> =>
    request<Order>(`/orders/${orderId}`),

  /** Cancels an order. The backend enforces whether the state machine still
   *  allows it — this will throw ApiError if the kitchen has started cooking. */
  cancelOrder: async (orderId: string, reason?: string): Promise<Order> =>
    request<Order>(`/orders/${orderId}/cancel`, {
      method: 'POST',
      body: { reason: reason ?? '' },
    }),
}

export default OrderingService
