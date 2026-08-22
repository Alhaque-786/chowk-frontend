import { Badge } from '@/components/ui/badge'
import { FoodMark } from '@/components/ui/food-mark'
import { discountPercent, formatRupees } from '@/lib/format'
import type { MenuItem } from '@/lib/api/types'

/**
 * One dish on the menu.
 *
 * A Server Component: it renders text and takes no interaction. Only the add
 * button below it needs to be a Client Component, which keeps the JavaScript
 * shipped for a fifty-item menu to one small island rather than fifty.
 */
export function MenuItemCard({
  item,
  action,
}: {
  item: MenuItem
  /** The add/quantity control, injected so this stays a Server Component. */
  action?: React.ReactNode
}) {
  const off = discountPercent(item.price_minor, item.compare_price_minor)

  return (
    <article className="flex gap-4 border-b border-rule py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <FoodMark type={item.food_type} />
          {item.is_recommended && <Badge tone="accent">Popular</Badge>}
        </div>

        <h3 className="mt-1.5 font-display text-[1.0625rem] font-semibold leading-snug text-ink">
          {item.name}
        </h3>

        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-semibold text-ink tabular">
            {formatRupees(item.price_minor)}
          </span>
          {item.compare_price_minor && (
            <>
              <span className="text-sm text-ink-faint line-through tabular">
                {formatRupees(item.compare_price_minor)}
              </span>
              {off && <Badge tone="success">{off}% off</Badge>}
            </>
          )}
        </div>

        {item.description && (
          // Clamped rather than truncated at a character count: a hard cut lands
          // mid-word and reads as a bug.
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">
            {item.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
          {item.rating_count > 0 && (
            <span className="tabular">
              ★ {item.rating_average.toFixed(1)}
              <span className="ml-1 text-ink-faint">({item.rating_count})</span>
            </span>
          )}
          {item.serves > 1 && <span>Serves {item.serves}</span>}
          {item.prep_minutes > 0 && <span>{item.prep_minutes} min</span>}
          {item.allergens.length > 0 && (
            // Allergen information is safety-critical, so it is never hidden
            // behind a tap.
            <span className="text-warning">Contains {item.allergens.join(', ')}</span>
          )}
        </div>
      </div>

      {action && <div className="flex shrink-0 items-start pt-1">{action}</div>}
    </article>
  )
}
