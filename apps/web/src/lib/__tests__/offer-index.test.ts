import { describe, expect, it } from 'vitest'

import { buildOfferIndex, offerHeadline } from '../offer-index'
import type { Offer, Paise } from '../api/types'

/**
 * Brands a plain number as Paise.
 *
 * Needed because `Paise` is a branded type and a bare `0` is a compile error — which
 * caught this test file on the first typecheck. That is the brand earning its keep in
 * the place it was designed for: `formatRupees(total)` and `formatRupees(total / 100)`
 * look equally plausible in review and differ by 100x, and the only reason the second
 * one cannot be written is this brand.
 */
const paise = (n: number) => n as unknown as Paise

function offer(over: Partial<Offer> & { code: string }): Offer {
  return {
    description: '',
    min_order_minor: paise(0),
    first_order_only: false,
    kitchen_ids: [],
    ...over,
  }
}

/**
 * The offer index, tested because its central rule is counter-intuitive and its
 * failure mode is invisible.
 *
 * `kitchen_ids: []` means EVERY kitchen. Reading an empty array as "applies to
 * nothing" is the obvious mistake, and it hides exactly the offers we most want
 * shown — the platform-wide ones. Nothing errors; the strip simply never appears,
 * and a missing promotion looks like a business decision rather than a bug.
 */
describe('buildOfferIndex', () => {
  it('treats an empty kitchen_ids as applying everywhere', () => {
    const index = buildOfferIndex([offer({ code: 'WELCOME50', kitchen_ids: [] })])
    expect(index.for('any-kitchen-at-all')?.code).toBe('WELCOME50')
    expect(index.for('another-one')?.code).toBe('WELCOME50')
  })

  it('applies a scoped offer only to its own kitchens', () => {
    const index = buildOfferIndex([offer({ code: 'AWADHI60', kitchen_ids: ['k1'] })])
    expect(index.for('k1')?.code).toBe('AWADHI60')
    expect(index.for('k2')).toBeUndefined()
  })

  it('prefers a kitchen-specific offer over a global one', () => {
    // Verified against the running app earlier: a kitchen with both showed
    // "Rs60 OFF on Awadhi" rather than the platform-wide WELCOME50.
    const index = buildOfferIndex([
      offer({ code: 'WELCOME50', kitchen_ids: [] }),
      offer({ code: 'AWADHI60', kitchen_ids: ['k1'] }),
    ])
    expect(index.for('k1')?.code).toBe('AWADHI60')
    // ...and the global one still covers everyone else.
    expect(index.for('k2')?.code).toBe('WELCOME50')
  })

  it('picks the offer with the lowest minimum order when several apply', () => {
    // An offer you can already use beats a better one you cannot.
    const index = buildOfferIndex([
      offer({ code: 'BIG', kitchen_ids: ['k1'], min_order_minor: paise(100_000) }),
      offer({ code: 'SMALL', kitchen_ids: ['k1'], min_order_minor: paise(20_000) }),
    ])
    expect(index.for('k1')?.code).toBe('SMALL')
  })

  it('deprioritises first-order-only offers at equal minimums', () => {
    // Most viewers are not first-time customers, so an offer most of them cannot
    // redeem is the wrong one to advertise.
    const index = buildOfferIndex([
      offer({ code: 'FIRSTONLY', kitchen_ids: ['k1'], first_order_only: true }),
      offer({ code: 'ANYONE', kitchen_ids: ['k1'], first_order_only: false }),
    ])
    expect(index.for('k1')?.code).toBe('ANYONE')
    // Order of arrival must not change the answer — the comparison has to be
    // symmetric, and a `better(a, b)` that returns `a` on ties is not.
    const reversed = buildOfferIndex([
      offer({ code: 'ANYONE', kitchen_ids: ['k1'], first_order_only: false }),
      offer({ code: 'FIRSTONLY', kitchen_ids: ['k1'], first_order_only: true }),
    ])
    expect(reversed.for('k1')?.code).toBe('ANYONE')
  })

  it('survives a backend that omits kitchen_ids entirely', () => {
    // `kitchen_ids` is a recent API addition. An older backend omits it, and the
    // field's own semantics say absent should mean global rather than a crash.
    const legacy = { code: 'OLD', description: '', min_order_minor: paise(0), first_order_only: false }
    const index = buildOfferIndex([legacy as unknown as Offer])
    expect(index.for('k1')?.code).toBe('OLD')
  })

  it('returns undefined, not a throw, when there are no offers', () => {
    expect(buildOfferIndex([]).for('k1')).toBeUndefined()
  })
})

describe('offerHeadline', () => {
  it('prefers the merchant-written description', () => {
    expect(offerHeadline(offer({ code: 'X', description: 'Rs60 off on Awadhi' }))).toBe(
      'Rs60 off on Awadhi',
    )
  })

  it('falls back to something actionable when the description is blank', () => {
    expect(offerHeadline(offer({ code: 'WELCOME50', description: '' }))).toBe(
      'Use code WELCOME50',
    )
    // Whitespace-only counts as blank, or the strip renders empty.
    expect(offerHeadline(offer({ code: 'WELCOME50', description: '   ' }))).toBe(
      'Use code WELCOME50',
    )
  })
})
