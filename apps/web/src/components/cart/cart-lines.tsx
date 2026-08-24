'use client'

import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { formatRupees } from '@/lib/format'
import type { Cart } from '@/lib/api/types'

/**
 * The cart's line items, shared by the drawer and the cart page.
 *
 * Extracted because the two rendered the same thing and would have drifted — and
 * the drift that matters is the price. `unit_price_minor` EXCLUDES modifiers, so
 * the effective per-item price has to be derived from the line total. Having that
 * derivation in one place means one of the two surfaces cannot start quietly
 * showing "₹389 each" beside a ₹1,058 line.
 */
export function CartLines({
  cart,
  onQuantityChange,
  busy,
  compact,
}: {
  cart: Cart
  onQuantityChange: (lineId: string, next: number) => void
  busy?: boolean
  /** Tighter spacing for the drawer, where vertical room is scarce. */
  compact?: boolean
}) {
  return (
    <ul className={compact ? 'flex flex-col' : ''}>
      {cart.lines.map((line) => (
        <li
          key={line.line_id}
          className={
            compact
              ? 'flex items-start gap-3 border-b border-rule-soft py-3 last:border-b-0'
              : 'flex items-start gap-4 border-b border-rule-soft p-4 last:border-b-0'
          }
        >
          <div className="min-w-0 flex-1">
            <p className="font-display text-[0.975rem] font-semibold leading-snug text-ink">
              {line.name}
            </p>

            {/* What they chose. Without it a half portion and a full one are
                indistinguishable in the customer's own cart. */}
            {line.modifiers && line.modifiers.length > 0 && (
              <p className="mt-0.5 text-xs leading-snug text-ink-soft">
                {line.modifiers.join(' · ')}
              </p>
            )}

            {/* Derived from the line total, NOT unit_price_minor — see the note
                at the top of this file. */}
            <p className="tabular mt-0.5 text-xs text-ink-faint">
              {formatRupees(Math.round(line.line_total_minor / line.quantity))} each
            </p>

            {!line.is_available && (
              <p className="mt-1 text-xs font-medium text-danger">
                Sold out — remove to continue
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <QuantityStepper
              quantity={line.quantity}
              onChange={(n) => onQuantityChange(line.line_id, n)}
              disabled={busy}
              itemName={line.name}
            />
            <span className="tabular text-sm font-semibold text-ink">
              {formatRupees(line.line_total_minor)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * The bill breakdown, shared for the same reason.
 *
 * EVERY line is shown before payment, which is the promise the home page makes —
 * "no surprise fees at the end". A collapsed "taxes and charges" row is exactly
 * the pattern that promise exists to reject, so this component has no option to
 * collapse it.
 */
export function CartTotals({ cart }: { cart: Cart }) {
  return (
    <dl className="flex flex-col gap-1.5 text-sm">
      <Row label="Item total" value={cart.subtotal_minor} />
      <Row label="Packaging" value={cart.packaging_fee_minor} />
      <Row label="Delivery" value={cart.delivery_fee_minor} />
      <Row label="GST" value={cart.tax_minor} />
      <div className="mt-1.5 flex items-baseline justify-between border-t border-rule pt-2.5">
        <dt className="font-display font-bold text-ink">To pay</dt>
        <dd className="tabular font-display text-lg font-bold text-ink">
          {formatRupees(cart.total_minor)}
        </dd>
      </div>
    </dl>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="tabular text-ink">{value === 0 ? 'Free' : formatRupees(value)}</dd>
    </div>
  )
}
