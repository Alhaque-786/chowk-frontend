'use client'

import { Banknote, Smartphone } from 'lucide-react'
import type { PaymentMethod } from '@/lib/api/types'

/**
 * How the customer wants to pay.
 *
 * UPI FIRST, AND DEFAULTED TO. It is how most of India pays online, it costs the
 * platform nothing — UPI carries zero MDR by regulation, unlike cards — and a
 * prepaid order cannot be refused at the door. Cash on delivery was the only
 * option here until now, which quietly meant every order carried the risk of a
 * doorstep rejection and a rider who has already paid for the fuel.
 *
 * Cards and netbanking are deliberately ABSENT rather than disabled. The backend
 * accepts them, but every one shown here is a decision the customer has to read
 * past, and on a food order under ₹500 essentially nobody reaches for netbanking.
 * They can be added when somebody asks.
 */
const OPTIONS: Array<{
  value: PaymentMethod
  label: string
  detail: string
  icon: typeof Smartphone
}> = [
  {
    value: 'upi',
    label: 'UPI',
    detail: 'GPay, PhonePe, Paytm or any UPI app',
    icon: Smartphone,
  },
  {
    value: 'cod',
    label: 'Cash on delivery',
    detail: 'Pay the rider when the food arrives',
    icon: Banknote,
  },
]

export function PaymentMethodPicker({
  value,
  onChange,
  disabled,
}: {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
  disabled?: boolean
}) {
  return (
    <fieldset disabled={disabled} className="mt-6">
      <legend className="mb-2 text-sm font-semibold text-ink">How would you like to pay?</legend>

      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const selected = value === option.value
          const Icon = option.icon
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              // aria-pressed, not a styled radio input: these are buttons that
              // change the form, and a screen reader should hear which is on.
              aria-pressed={selected}
              className={
                selected
                  ? 'flex items-start gap-3 rounded-xl border-2 border-brand bg-brand-soft p-3 text-left transition-colors disabled:opacity-60'
                  : 'flex items-start gap-3 rounded-xl border border-rule-strong bg-surface p-3 text-left transition-colors hover:border-brand/50 disabled:opacity-60'
              }
            >
              <Icon
                className={selected ? 'mt-0.5 size-5 shrink-0 text-brand' : 'mt-0.5 size-5 shrink-0 text-ink-faint'}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{option.label}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">{option.detail}</span>
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
