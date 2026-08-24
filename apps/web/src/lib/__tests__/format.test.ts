import { describe, expect, it } from 'vitest'

import {
  discountPercent,
  formatDistance,
  formatEta,
  formatRupees,
  formatRupeesWhole,
} from '../format'

/**
 * Money formatting, tested first because it is the highest-consequence pure
 * function in the app: every price a customer sees passes through it, and every
 * failure mode is silent. Nothing throws when a bill renders as ₹45 instead of
 * ₹4,500 — it just looks like a cheap restaurant.
 */
describe('formatRupees', () => {
  it('treats the input as paise, not rupees', () => {
    // THE 100x BUG, as a test. `formatRupees(total)` and
    // `formatRupees(total / 100)` look equally plausible in review, and this is
    // the assertion that tells them apart.
    expect(formatRupees(45000)).toBe('₹450')
    expect(formatRupees(100)).toBe('₹1')
    expect(formatRupees(1)).toBe('₹0.01')
  })

  it('groups digits the Indian way, not the Western way', () => {
    /*
      1,00,000 — not 100,000. This is why the implementation uses en-IN rather than
      hand-rolled comma insertion, and the difference only shows up above ₹99,999,
      which is exactly where nobody tests by hand.

      Written as `rupees * 100` rather than as a paise literal on purpose: my first
      version of this test used `10_000_00` and asserted ₹1,00,000, which is wrong
      by a factor of ten — that literal is ₹10,000. The test failed and the code was
      right. A unit whose literals need mental arithmetic to read is a unit that
      will be asserted incorrectly, so the conversion is spelled out.
    */
    expect(formatRupees(100_000 * 100)).toBe('₹1,00,000')
    expect(formatRupees(1_000_000 * 100)).toBe('₹10,00,000')
    expect(formatRupees(10_000_000 * 100)).toBe('₹1,00,00,000')
    // Below the lakh threshold the two conventions agree, which is what makes the
    // bug survive casual testing.
    expect(formatRupees(99_999 * 100)).toBe('₹99,999')
  })

  it('shows paise only when there are paise', () => {
    expect(formatRupees(45050)).toBe('₹450.50')
    expect(formatRupees(45005)).toBe('₹450.05')
    expect(formatRupees(45000)).toBe('₹450')
  })

  it('pads a single paisa so it cannot read as ten', () => {
    // ₹450.5 would be five paise short of what it looks like.
    expect(formatRupees(45005)).toBe('₹450.05')
    expect(formatRupees(45050)).toBe('₹450.50')
  })

  it('uses a real minus sign for refunds and adjustments', () => {
    expect(formatRupees(-45000)).toBe('−₹450')
    // The sign goes OUTSIDE the symbol: ₹−450 is not how anyone writes it.
    expect(formatRupees(-45000).startsWith('−₹')).toBe(true)
  })

  it('can drop the symbol for use next to a standalone ₹', () => {
    expect(formatRupees(45000, { withSymbol: false })).toBe('450')
  })

  it('truncates rather than rounding a fractional paisa', () => {
    // A fractional paisa should never reach here, but if it does, truncating
    // keeps the total consistent with the integer arithmetic upstream.
    expect(formatRupees(45000.9)).toBe('₹450')
  })
})

describe('formatRupeesWhole', () => {
  it('rounds to the nearest rupee', () => {
    expect(formatRupeesWhole(45049)).toBe('₹450')
    expect(formatRupeesWhole(45050)).toBe('₹451')
  })

  it('keeps Indian grouping', () => {
    expect(formatRupeesWhole(100_000 * 100)).toBe('₹1,00,000')
  })
})

describe('formatEta', () => {
  it('rounds down to a 5-minute floor and shows a range', () => {
    // A range is a promise the kitchen can keep; "32 min" is not.
    expect(formatEta(32)).toBe('30–35 min')
    expect(formatEta(30)).toBe('30–35 min')
  })

  it('never promises under 5 minutes', () => {
    expect(formatEta(1)).toBe('5–10 min')
    expect(formatEta(4)).toBe('5–10 min')
  })

  it('handles a missing or zero estimate without printing "0 min"', () => {
    expect(formatEta(0)).toBe('Any moment')
    expect(formatEta(-5)).toBe('Any moment')
  })
})

describe('formatDistance', () => {
  it('rounds metres to 50 so the number does not imply GPS precision', () => {
    expect(formatDistance(375)).toBe('400 m')
    expect(formatDistance(324)).toBe('300 m')
  })

  it('switches to kilometres at 1000, with one decimal', () => {
    expect(formatDistance(999)).toBe('1000 m')
    expect(formatDistance(1000)).toBe('1.0 km')
    expect(formatDistance(1240)).toBe('1.2 km')
  })
})

describe('discountPercent', () => {
  it('computes the badge from the compare price', () => {
    expect(discountPercent(50_00, 100_00)).toBe(50)
    expect(discountPercent(75_00, 100_00)).toBe(25)
  })

  it('returns null rather than 0 or a negative when there is no discount', () => {
    // A badge reading "0% OFF" or "−5% OFF" is worse than no badge, so the
    // caller needs a value it can branch on.
    expect(discountPercent(100_00, 100_00)).toBeNull()
    expect(discountPercent(100_00, 90_00)).toBeNull()
    expect(discountPercent(100_00, undefined)).toBeNull()
    expect(discountPercent(100_00, 0)).toBeNull()
  })
})
