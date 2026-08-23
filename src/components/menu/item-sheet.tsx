'use client'

import { useMemo, useState } from 'react'
import { Loader2, Minus, Plus } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { DishImage } from '@/components/ui/dish-image'
import { FoodMark } from '@/components/ui/food-mark'
import { formatRupees } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { MenuItem, ModifierGroup } from '@/lib/api/types'

/**
 * Choose a dish's options before it goes in the cart.
 *
 * THIS FIXES A CORRECTNESS BUG, not just a gap in polish. Khansama's biryani has
 * a REQUIRED "Choose portion" group where Full costs ₹140 more than Half, and the
 * previous Add button skipped it entirely — so a customer ordered a portion they
 * never picked, and the backend accepts an add with no modifiers, so nothing
 * complained. The sheet is the only place that choice can be made.
 *
 * Only shown when a dish HAS options. A bottled water still adds in one tap; an
 * app that makes you confirm a sheet to buy water is worse, not more thorough.
 *
 * Price maths lives here and is recomputed on every change, because a total that
 * appears only after you commit is the thing customers distrust most. What this
 * shows is the same arithmetic the server does — base plus selected modifiers,
 * times quantity — and the server remains authoritative.
 */
export function ItemSheet({
  item,
  open,
  onOpenChange,
  onConfirm,
  busy,
}: {
  item: MenuItem
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Receives the chosen modifier ids and quantity. */
  onConfirm: (modifierIds: string[], quantity: number) => void
  busy?: boolean
}) {
  /*
    Memoised because `?? []` mints a NEW array whenever modifier_groups is
    absent, which would give the price useMemo below a changed dependency on every
    render and make the memo pointless. A cheap fix for a real waste: the price
    maths walks every modifier in every group.
  */
  const groups = useMemo(() => item.modifier_groups ?? [], [item.modifier_groups])

  /*
    Selection is a map of groupId -> chosen modifier ids.

    Keyed by GROUP rather than a flat set of ids, because every rule that matters
    is per-group: "exactly one portion", "up to three add-ons". A flat set would
    make enforcing max_select a search through every group on each tap.
  */
  const [chosen, setChosen] = useState<Record<string, string[]>>(() => initial(groups))
  const [quantity, setQuantity] = useState(1)

  function toggle(group: ModifierGroup, modifierId: string) {
    setChosen((prev) => {
      const current = prev[group.id] ?? []

      // Single-select behaves as a radio: picking replaces rather than adds. And
      // a required single-select cannot be un-picked, because leaving it empty is
      // not a state the customer is allowed to submit — silently doing nothing is
      // clearer than letting them create an invalid selection.
      if (group.max_select <= 1) {
        if (current[0] === modifierId) {
          return group.is_required ? prev : { ...prev, [group.id]: [] }
        }
        return { ...prev, [group.id]: [modifierId] }
      }

      if (current.includes(modifierId)) {
        return { ...prev, [group.id]: current.filter((m) => m !== modifierId) }
      }
      // At the cap, ignore the tap rather than silently dropping an earlier
      // choice. Dropping one would look like a bug; the cap is stated in the
      // group's own label so the limit is not a surprise.
      if (current.length >= group.max_select) return prev
      return { ...prev, [group.id]: [...current, modifierId] }
    })
  }

  const flatIds = useMemo(() => Object.values(chosen).flat(), [chosen])

  const unitPrice = useMemo(() => {
    const extras = groups
      .flatMap((g) => g.modifiers)
      .filter((m) => flatIds.includes(m.id))
      .reduce((sum, m) => sum + m.price_minor, 0)
    return item.price_minor + extras
  }, [groups, flatIds, item.price_minor])

  /** Groups still awaiting a required choice. Drives both the disabled button and
   *  the hint, so the two can never disagree. */
  const unmet = groups.filter(
    (g) => g.is_required && (chosen[g.id]?.length ?? 0) < Math.max(g.min_select, 1),
  )

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={item.name}
      description={item.description || undefined}
      footer={
        <div className="flex flex-col gap-2">
          {unmet.length > 0 && (
            // Named, not "please complete required fields". The customer needs to
            // know WHICH choice is missing to act on it.
            <p className="text-center text-xs text-ink-soft" role="status">
              Choose {unmet.map((g) => g.name.toLowerCase()).join(' and ')} to continue
            </p>
          )}
          <Button
            fullWidth
            size="lg"
            disabled={busy || unmet.length > 0}
            onClick={() => onConfirm(flatIds, quantity)}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Add {quantity > 1 ? `${quantity} ` : ''}to cart
            <span className="tabular ml-auto font-semibold">
              {formatRupees(unitPrice * quantity)}
            </span>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex gap-4">
          <DishImage
            name={item.name}
            src={item.image_url}
            className="size-24 shrink-0 rounded-xl ring-1 ring-rule/60"
            sizes="96px"
          />
          <div className="min-w-0">
            <FoodMark type={item.food_type} />
            <p className="tabular mt-1.5 font-display text-lg font-bold text-ink">
              {formatRupees(item.price_minor)}
            </p>
            {item.serves > 1 && (
              <p className="mt-0.5 text-xs text-ink-faint">Serves {item.serves}</p>
            )}
            {item.allergens.length > 0 && (
              // Never behind a tap: allergen information is safety-critical.
              <p className="mt-1 text-xs text-warning">
                Contains {item.allergens.join(', ')}
              </p>
            )}
          </div>
        </div>

        {groups.map((group) => {
          const current = chosen[group.id] ?? []
          const single = group.max_select <= 1
          return (
            <fieldset key={group.id} className="border-0 p-0">
              {/*
                A real fieldset and legend, so a screen reader announces "Choose
                portion, required" once and then reads the options as a set rather
                than as five unrelated controls in a row.
              */}
              <legend className="mb-2.5 flex w-full items-baseline justify-between gap-3">
                <span className="font-display text-sm font-bold text-ink">
                  {group.name}
                </span>
                <span className="text-xs text-ink-faint">
                  {group.is_required
                    ? 'Required'
                    : `Optional · up to ${group.max_select}`}
                </span>
              </legend>

              <div className="flex flex-col gap-1.5">
                {group.modifiers.map((modifier) => {
                  const selected = current.includes(modifier.id)
                  const atCap = !single && !selected && current.length >= group.max_select
                  return (
                    <label
                      key={modifier.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition-colors',
                        selected
                          ? 'bg-brand-soft ring-brand/30'
                          : 'ring-rule hover:bg-surface-sunk',
                        atCap && 'cursor-not-allowed opacity-45',
                      )}
                    >
                      {/*
                        Native radio and checkbox inputs, not styled divs. They
                        bring keyboard arrow-key navigation within the group, the
                        correct announced role, and form semantics — all of which
                        would have to be rebuilt by hand and usually is not.
                      */}
                      <input
                        type={single ? 'radio' : 'checkbox'}
                        name={group.id}
                        checked={selected}
                        disabled={atCap}
                        onChange={() => toggle(group, modifier.id)}
                        className="accent-brand"
                      />
                      <span className="min-w-0 flex-1 text-sm text-ink">
                        {modifier.name}
                      </span>
                      <span className="tabular shrink-0 text-sm text-ink-soft">
                        {modifier.price_minor === 0
                          ? 'Included'
                          : `+${formatRupees(modifier.price_minor)}`}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )
        })}

        <div className="flex items-center justify-between gap-4 border-t border-rule pt-4">
          <span className="text-sm font-medium text-ink">Quantity</span>
          <div className="flex items-center gap-1 rounded-xl ring-1 ring-rule-strong">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="grid size-9 place-items-center rounded-l-xl text-ink transition-colors hover:bg-surface-sunk disabled:opacity-40"
              aria-label="Reduce quantity"
            >
              <Minus className="size-4" />
            </button>
            <span
              className="tabular w-8 text-center text-sm font-semibold text-ink"
              // Announced as it changes, so a screen-reader user hears the new
              // quantity instead of having to hunt for it.
              aria-live="polite"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              disabled={quantity >= 20}
              className="grid size-9 place-items-center rounded-r-xl text-ink transition-colors hover:bg-surface-sunk disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

/**
 * Preselects the obvious default for a required single choice.
 *
 * A required group with a zero-cost option starts on it, because the customer
 * opened this sheet to order food and not to answer a form. It is a real default
 * rather than a trick: it is the cheapest option, it is visibly selected, and
 * changing it is one tap.
 *
 * A required group whose cheapest option COSTS money is left blank on purpose —
 * preselecting a paid option is how a customer ends up charged for something they
 * never chose.
 */
function initial(groups: ModifierGroup[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const group of groups) {
    if (!group.is_required || group.max_select > 1) continue
    const free = group.modifiers.find((m) => m.price_minor === 0)
    if (free) out[group.id] = [free.id]
  }
  return out
}
