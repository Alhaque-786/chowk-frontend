import { cache } from 'react'
import { api, type CallOptions } from '@/lib/api/client'
import type { CouponCheck, Offer } from '@/lib/api/types'

/**
 * Offers and coupons — the `promotion` backend module.
 *
 * Note the split in failure handling. Listing offers is decoration and degrades
 * silently; checking a code the customer typed must NOT, because "your coupon
 * did not apply and we will not say why" is the single most infuriating thing a
 * checkout can do.
 */
const PromotionService = {
  /** Live offers, optionally for one kitchen. Degrades to empty — a missing
   *  offers rail is not an error worth a blank page. */
  listOffers: cache(async (kitchenId?: string, options?: CallOptions): Promise<Offer[]> => {
    try {
      const query = kitchenId ? `?kitchen_id=${kitchenId}` : ''
      const result = await api.get<{ offers: Offer[] }>(`/offers${query}`, {
        auth: false,
        revalidate: 300,
        ...options,
      })
      return result.offers ?? []
    } catch {
      return []
    }
  }),

  /**
   * Validates a coupon code against a cart.
   *
   * NOT cache-wrapped and NOT error-swallowing: it is called from checkout in
   * response to a keystroke, and the caller has to be able to show the real
   * reason a code was rejected. Throws ApiError, whose `code` carries it.
   *
   * Advisory only. The authoritative check happens inside the checkout
   * transaction, because a coupon's global cap can be exhausted between this
   * call and the order being placed.
   */
  checkCode: async (
    code: string,
    kitchenId: string,
    /**
     * The cart subtotal in paise. REQUIRED, not optional.
     *
     * The endpoint prices the coupon against a subtotal supplied in the request —
     * it does not read the cart. Omitting it sends 0, and the server answers
     * "Your cart is empty" for a cart with three items in it. That is exactly what
     * happened: every code appeared invalid because the request said the order was
     * worth nothing.
     *
     * A required positional parameter rather than an optional field, so the
     * mistake cannot be made again silently.
     */
    subtotalMinor: number,
    options?: CallOptions,
  ): Promise<CouponCheck> =>
    api.post<CouponCheck>(
      '/offers/check',
      { code, kitchen_id: kitchenId, subtotal_minor: subtotalMinor },
      {
        // AUTHENTICATED: the endpoint needs the user to evaluate per-user caps and
        // whether this is their first order. `auth: false` here made every check
        // fail as an unauthenticated request.
        // Typed into a box by a person who is waiting: fail fast and let them
        // retype rather than making them watch a spinner for fifteen seconds.
        timeoutMs: 5_000,
        retry: false,
        ...options,
      },
    ),
}

export default PromotionService
