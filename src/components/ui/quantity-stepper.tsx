'use client'

import { cn } from '@/lib/cn'

/**
 * The −/+ control on a cart line.
 *
 * Both buttons stay mounted at zero rather than collapsing to an "Add" button,
 * because a control that changes shape under the thumb causes mis-taps. At
 * quantity 1 the minus becomes a remove action, which is what the customer
 * expects it to do.
 */
export function QuantityStepper({
  quantity,
  onChange,
  max = 20,
  disabled = false,
  itemName,
}: {
  quantity: number
  onChange: (next: number) => void
  max?: number
  disabled?: boolean
  /** Used for accessible labels, so "increase" is not ambiguous in a long list. */
  itemName: string
}) {
  const atMax = quantity >= max

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-xl border border-rule-strong bg-surface',
        disabled && 'opacity-50',
      )}
    >
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={disabled || quantity <= 0}
        // Names the item: a screen reader in a ten-line cart otherwise hears
        // "decrease" ten times with no way to tell them apart.
        aria-label={quantity <= 1 ? `Remove ${itemName}` : `Decrease ${itemName}`}
        className="grid size-9 place-items-center text-ink-soft transition-colors hover:text-brand disabled:opacity-40 disabled:hover:text-ink-soft"
      >
        {quantity <= 1 ? <TrashIcon /> : <MinusIcon />}
      </button>

      <span
        className="min-w-7 text-center text-sm font-semibold tabular"
        // The value changes without a page load, so it must be announced.
        aria-live="polite"
        aria-atomic="true"
      >
        {quantity}
      </span>

      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={disabled || atMax}
        aria-label={atMax ? `Maximum ${max} of ${itemName}` : `Add another ${itemName}`}
        className="grid size-9 place-items-center text-ink-soft transition-colors hover:text-brand disabled:opacity-40 disabled:hover:text-ink-soft"
      >
        <PlusIcon />
      </button>
    </div>
  )
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
      <path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
      <path
        d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 8.2a1 1 0 0 0 1 .8h4.6a1 1 0 0 0 1-.8l.7-8.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
