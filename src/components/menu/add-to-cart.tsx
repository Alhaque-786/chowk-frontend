'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { requireAuth } from '@/lib/auth-gate'
import OrderingService from '@/services/OrderingService'
import { ApiError } from '@/lib/api/errors'
import { cn } from '@/lib/cn'

/**
 * The add / quantity control for one dish.
 *
 * THE ONLY interactive island on the menu. A fifty-item menu ships fifty of
 * these and nothing else client-side, because MenuItemCard stays a Server
 * Component — that is the whole reason the `action` prop exists.
 *
 * It holds an optimistic local quantity rather than reading the server cart.
 * Reading the cart would mean one request per item on page load, or threading a
 * cart through fifty server-rendered cards. The trade is that the number here can
 * drift from the server after a reload; the SERVER cart is authoritative and the
 * cart page reads it directly, so a drift shows a stale button, never a wrong
 * order.
 */
export function AddToCart({
  kitchenId,
  itemId,
  itemName,
  disabled,
  disabledReason,
}: {
  kitchenId: string
  itemId: string
  itemName: string
  /** Sold out, or the kitchen is closed. */
  disabled?: boolean
  disabledReason?: string
}) {
  const [quantity, setQuantity] = useState(0)
  const [lineId, setLineId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (disabled) {
    return (
      <span className="rounded-lg border border-rule px-2.5 py-1.5 text-xs font-medium text-ink-faint">
        {disabledReason ?? 'Unavailable'}
      </span>
    )
  }

  async function add() {
    // The gate returns immediately when a token exists, so the signed-in path
    // costs nothing. If they dismiss the sheet we stop silently — they chose to.
    if (!(await requireAuth(`Sign in to add ${itemName} to your cart.`))) return

    setBusy(true)
    setError(null)
    try {
      const cart = await OrderingService.addToCart({
        kitchen_id: kitchenId,
        menu_item_id: itemId,
        quantity: 1,
      })
      // Read the line back rather than assuming: the server decides how lines
      // are merged, and `line_id` is what a later quantity change needs.
      const line = cart.lines.find((l) => l.menu_item_id === itemId)
      setQuantity(line?.quantity ?? 1)
      setLineId(line?.line_id ?? null)
    } catch (err) {
      setError(shortMessage(err))
      // Left at 0 on failure. Showing a stepper for something that is not in the
      // cart is worse than showing the add button again.
    } finally {
      setBusy(false)
    }
  }

  async function change(next: number) {
    if (!lineId) return
    const previous = quantity
    setQuantity(next) // Optimistic: the stepper must feel instant.
    setBusy(true)
    setError(null)
    try {
      const cart = await OrderingService.setQuantity(lineId, next)
      const line = cart.lines.find((l) => l.line_id === lineId)
      // Absent means the server removed the line, which is what quantity 0 does.
      setQuantity(line?.quantity ?? 0)
      if (!line) setLineId(null)
    } catch (err) {
      setQuantity(previous) // Roll back, so the number never lies.
      setError(shortMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {quantity === 0 ? (
        <button
          type="button"
          onClick={add}
          disabled={busy}
          className={cn(
            'inline-flex min-h-9 items-center gap-1 rounded-lg bg-surface px-3.5 text-sm font-semibold text-brand ring-1 ring-brand/30 transition-colors',
            'hover:bg-brand-soft active:translate-y-px disabled:opacity-60',
          )}
          aria-label={`Add ${itemName} to cart`}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Add
        </button>
      ) : (
        <QuantityStepper
          quantity={quantity}
          onChange={change}
          disabled={busy}
          itemName={itemName}
        />
      )}

      {error && (
        <span className="max-w-[7rem] text-center text-[0.6875rem] leading-tight text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

/**
 * Keeps the server's message when there is one, trimmed to fit under a button.
 *
 * The backend writes these for customers — "Only 2 left", "This kitchen is
 * closed" — and each implies a different next action. A generic "failed" would
 * discard the only useful part.
 */
function shortMessage(err: unknown): string {
  if (err instanceof ApiError && err.message) {
    return err.message.length > 60 ? 'Could not add that.' : err.message
  }
  return 'Could not add that.'
}
