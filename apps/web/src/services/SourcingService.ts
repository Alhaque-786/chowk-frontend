import { api, type CallOptions } from '@/lib/api/client'

/** Who is telling us. The outreach script is not the same for the two. */
export type LeadKind = 'referral' | 'self_signup'

/**
 * The sort of business, which is the first guess at how it would operate.
 *
 * A juice cart is almost certainly an assisted vendor — our team takes the order
 * and delivers — while a restaurant almost certainly runs its own dashboard.
 */
export type VendorKind =
  | 'juice_cart'
  | 'tiffin'
  | 'cloud_kitchen'
  | 'restaurant'
  | 'sweet_shop'
  | 'other'

export type LeadSubmission = {
  kind: LeadKind
  business_name: string
  contact_name?: string
  contact_phone: string
  area: string
  vendor_kind: VendorKind
  note?: string
}

/**
 * Telling us about a vendor who should be on the platform.
 *
 * UNAUTHENTICATED ON PURPOSE, matching the backend mount. The person best placed
 * to refer a nariyal pani cart is the customer who walks past it every morning,
 * and they will not create an account first. A signed-in submitter is attributed
 * automatically because the endpoint runs under optional auth — nothing here has
 * to know or care which case it is.
 *
 * No idempotency key, unlike checkout. A repeat submission is not a mistake to
 * suppress: two people naming the same cart is the signal the backend is built to
 * keep. Deduplicating here would throw it away before it ever arrived.
 */
const SourcingService = {
  submit: async (
    lead: LeadSubmission,
    options?: CallOptions,
  ): Promise<{ id: string; received: boolean }> =>
    api.post<{ id: string; received: boolean }>('/vendor-leads', lead, {
      timeoutMs: 10_000,
      ...options,
    }),
}

export default SourcingService
