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
    options?: CallOptions,
  ): Promise<CouponCheck> =>
    api.post<CouponCheck>(
      '/offers/check',
      { code, kitchen_id: kitchenId },
      {
        auth: false,
        // Typed into a box by a person who is waiting: fail fast and let them
        // retype rather than making them watch a spinner for fifteen seconds.
        timeoutMs: 5_000,
        retry: false,
        ...options,
      },
    ),
}

export default PromotionService
