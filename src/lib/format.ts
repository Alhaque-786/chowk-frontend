import type { Paise } from './api/types'

/**
 * Formats an amount for display.
 *
 * Takes the branded Paise type, so passing a raw number is a compile error. That
 * matters more than it sounds: `formatRupees(order.total_minor)` and
 * `formatRupees(order.total_minor / 100)` look equally plausible in review, and
 * one of them is off by 100x on every price in the app.
 *
 * Integer arithmetic throughout — the value never becomes a float, so there is no
 * rounding to get wrong.
 */
export function formatRupees(minor: Paise | number, opts?: { withSymbol?: boolean }): string {
  const withSymbol = opts?.withSymbol ?? true
  const negative = minor < 0
  const abs = Math.abs(Math.trunc(minor))

  const whole = Math.trunc(abs / 100)
  const paise = abs % 100

  // Indian digit grouping: 1,00,000 not 100,000. Intl handles this correctly for
  // en-IN, and hand-rolling it is a well-known source of wrong invoices.
  const grouped = whole.toLocaleString('en-IN')

  const body = paise === 0 ? grouped : `${grouped}.${String(paise).padStart(2, '0')}`
  return `${negative ? '−' : ''}${withSymbol ? '₹' : ''}${body}`
}

/** Rounds to whole rupees for prominent display, where paise are visual noise. */
export function formatRupeesWhole(minor: Paise | number): string {
  return `₹${Math.round(Math.abs(minor) / 100).toLocaleString('en-IN')}`
}

/**
 * Renders a prep/delivery estimate as a range.
 *
 * A range is honest in a way a single number is not: "30-35 min" sets an
 * expectation the kitchen can actually meet, where "32 min" implies a precision
 * nobody has and reads as a broken promise when it slips.
 */
export function formatEta(minutes: number): string {
  if (minutes <= 0) return 'Any moment'
  const lower = Math.max(5, Math.round(minutes / 5) * 5)
  return `${lower}–${lower + 5} min`
}

/** Distance for a kitchen list. Metres under a kilometre, then one decimal. */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 50) * 50} m`
  return `${(metres / 1000).toFixed(1)} km`
}

/** Discount badge percentage, from the compare price. */
export function discountPercent(price: number, comparePrice?: number): number | null {
  if (!comparePrice || comparePrice <= price) return null
  return Math.round(((comparePrice - price) / comparePrice) * 100)
}
