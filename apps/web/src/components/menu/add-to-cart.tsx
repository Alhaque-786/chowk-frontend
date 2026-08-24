'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { ItemSheet } from '@/components/menu/item-sheet'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { requireAuth } from '@/lib/auth-gate'
import OrderingService from '@/services/OrderingService'
import { ApiError, messageFor } from '@/lib/api/errors'
import { cn } from '@/lib/cn'
import type { MenuItem } from '@/lib/api/types'

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
  item,
  disabled,
  disabledReason,
}: {
  kitchenId: string
  /**
   * The whole item, not just its id and name.
   *
   * The sheet needs its price, image, allergens and modifier groups, and passing
   * five props instead would mean every new field the sheet shows becomes another
   * prop threaded through the menu.
   */
  item: MenuItem
  /** Sold out, or the kitchen is closed. */
  disabled?: boolean
  disabledReason?: string
}) {
  const itemId = item.id
  const itemName = item.name
  /** Dishes with options must be configured before they can be added. */
  const needsChoices = (item.modifier_groups ?? []).length > 0
  const [sheetOpen, setSheetOpen] = useState(false)

  /*
    A cart belongs to ONE kitchen, so adding from a second is refused. That is a
    decision to offer, not an error to report — "your cart has items from another
    kitchen" leaves the customer to work out what to do, whereas "replace your
    Khansama order?" is answerable on the spot.

    The pending add is held so Replace can retry the EXACT same request —
    modifiers and quantity included. Asking them to configure the dish again after
    confirming would be its own small insult.
  */
  const [conflict, setConflict] = useState<{
    kitchenName: string
    modifierIds: string[]
    quantity: number
  } | null>(null)
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

  /**
   * Opens the sheet, or adds straight away.
   *
   * Auth is asked for BEFORE the sheet, deliberately. Letting someone configure a
   * dish and then demanding a sign-in throws away the work they just did.
   */
  async function start() {
    if (!(await requireAuth(`Sign in to add ${itemName} to your cart.`))) return
    if (needsChoices) {
      setSheetOpen(true)
      return
    }
    await add([], 1)
  }

  async function add(modifierIds: string[], quantity: number) {
    setBusy(true)
    setError(null)
    try {
      await addOnce(modifierIds, quantity)
    } catch (err) {
      // A cart from another kitchen is the one failure worth offering a way out
      // of rather than reporting. `code`, not the message text — copy changes.
      if (err instanceof ApiError && err.code === 'DIFFERENT_KITCHEN') {
        // Read the existing cart purely to name it. Best-effort: a failed lookup
        // costs a specific name, never the prompt itself.
        let kitchenName = 'another kitchen'
        try {
          const current = await OrderingService.getCart()
          if (current.kitchen_name) kitchenName = current.kitchen_name
        } catch {
          /* keep the generic wording */
        }
        setSheetOpen(false)
        setConflict({ kitchenName, modifierIds, quantity })
        return
      }
      setError(messageUnderButton(err))
    } finally {
      setBusy(false)
    }
  }

  /** Replaces the cart, then retries the add that was refused. */
  async function replaceCartAndAdd() {
    if (!conflict) return
    setBusy(true)
    setError(null)
    try {
      await OrderingService.clearCart()
      await addOnce(conflict.modifierIds, conflict.quantity)
      setConflict(null)
    } catch (err) {
      setConflict(null)
      setError(messageUnderButton(err))
    } finally {
      setBusy(false)
    }
  }

  /**
   * One attempt at the add.
   *
   * THROWS rather than handling failure, which is the point of splitting it out:
   * the caller decides what a failure means. `add` turns DIFFERENT_KITCHEN into a
   * prompt, `replaceCartAndAdd` treats the same error as fatal because it has
   * already cleared the cart and a second conflict would be a real bug.
   */
  async function addOnce(modifierIds: string[], quantity: number) {
    const cart = await OrderingService.addToCart({
      kitchen_id: kitchenId,
      menu_item_id: itemId,
      quantity,
      ...(modifierIds.length > 0 ? { modifier_ids: modifierIds } : {}),
    })
    setSheetOpen(false)

    // Read the line back rather than assuming: the server decides how lines
    // merge, and `line_id` is what a later quantity change needs.
    //
    // Reversed before `find`, so this picks the LAST match: with modifiers the
    // same dish can occupy several lines (a half portion and a full one), and the
    // one just added is the most recent. Taking the first would attach the
    // stepper to a different line.
    const line = [...cart.lines].reverse().find((l) => l.menu_item_id === itemId)
    setQuantity(line?.quantity ?? quantity)
    setLineId(line?.line_id ?? null)
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
      setError(messageUnderButton(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Rendered only once opened, so a fifty-item menu does not mount fifty
          sheets it will never show. */}
      {/*
        The replace-cart decision. A Sheet rather than window.confirm: it can name
        both kitchens, it is dismissible by drag on a phone, and Keep is the
        default action because losing a cart you built is the more expensive
        mistake of the two.
      */}
      {conflict && (
        <Sheet
          open
          onOpenChange={(open) => { if (!open) setConflict(null) }}
          title="Start a new cart?"
          description={`Your cart has items from ${conflict.kitchenName}. An order can only come from one kitchen.`}
          footer={
            <div className="flex flex-col gap-2">
              <Button fullWidth size="lg" disabled={busy} onClick={replaceCartAndAdd}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Replace with {itemName}
              </Button>
              <Button
                fullWidth
                size="lg"
                variant="secondary"
                onClick={() => setConflict(null)}
              >
                Keep my {conflict.kitchenName} cart
              </Button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-ink-soft">
            Replacing empties your current cart. Nothing has been ordered yet, so
            nothing is charged either way.
          </p>
        </Sheet>
      )}

      {needsChoices && sheetOpen && (
        <ItemSheet
          item={item}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onConfirm={(ids, qty) => void add(ids, qty)}
          busy={busy}
        />
      )}
      {quantity === 0 ? (
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className={cn(
            'inline-flex min-h-9 items-center gap-1 rounded-lg bg-surface px-3.5 text-sm font-semibold text-brand ring-1 ring-brand/30 transition-colors',
            'hover:bg-brand-soft active:translate-y-px disabled:opacity-60',
          )}
          // Says which it is, so a screen reader user knows a sheet is coming
          // rather than being surprised by a dialog.
          aria-label={
            needsChoices ? `Choose options for ${itemName}` : `Add ${itemName} to cart`
          }
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Add
        </button>
      ) : (
        // `pop-in` fires once, when the Add button becomes a stepper. That is
        // the moment something entered the cart, and a 220ms overshoot says so
        // without a toast the customer then has to dismiss.
        <div className="pop-in">
          <QuantityStepper
            quantity={quantity}
            onChange={change}
            disabled={busy}
            itemName={itemName}
          />
        </div>
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
 * The message to show under the button.
 *
 * NO LENGTH TRUNCATION. The previous version replaced anything over 60 characters
 * with "Could not add that." — and the most common real failure here is
 * DIFFERENT_KITCHEN, whose message is 76 characters. So the one error customers
 * actually hit was reduced to a useless string by our own helper, while the server
 * had written a perfectly clear explanation.
 *
 * The lesson generalises: truncating an error by LENGTH throws away exactly the
 * messages that needed the length. If it does not fit, the layout is wrong.
 */
function messageUnderButton(err: unknown): string {
  return messageFor(err, 'Could not add that.')
}
