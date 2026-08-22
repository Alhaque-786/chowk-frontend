import Link from 'next/link'
import { Clock, Star } from 'lucide-react'
import { DishImage } from '@/components/ui/dish-image'
import { Pressable } from '@/components/ui/reveal'
import { formatDistance, formatRupees } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { NearbyKitchen } from '@/lib/api/types'

/**
 * A kitchen in a list.
 *
 * Image-led, because that is what makes a food listing scannable — the eye lands
 * on the picture, then the name, then the numbers. A text-first card forces
 * reading, and nobody reads a list of twenty restaurants.
 *
 * The whole card is one link: a small tap target inside a large card is the most
 * common cause of a mis-tap on a phone.
 */
export function KitchenCard({
  kitchen,
  priority = false,
}: {
  kitchen: NearbyKitchen
  /** Set on the first card or two, so the LCP image is not lazy-loaded. */
  priority?: boolean
}) {
  const { is_open, distance_m } = kitchen
  const goodRating = kitchen.rating_count > 0 && kitchen.rating_average >= 4

  return (
    <li>
      <Pressable>
        <Link
          href={`/kitchens/${kitchen.id}`}
          className="group block overflow-hidden rounded-lg border border-rule bg-surface shadow-sm transition-shadow hover:shadow-lg"
        >
          <div className="relative aspect-[16/10] w-full">
            <DishImage
              name={kitchen.name}
              foodType="veg"
              className="absolute inset-0 size-full transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
              priority={priority}
            />

            {/* A closed kitchen is dimmed AND labelled. Dimming alone reads as a
                loading state; the label alone is easy to miss. */}
            {!is_open && (
              <div className="absolute inset-0 grid place-items-center bg-black/55">
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink">
                  Closed right now
                </span>
              </div>
            )}

            {kitchen.min_order_minor > 0 && is_open && (
              <span className="absolute bottom-2 left-2 rounded-md bg-surface/95 px-2 py-1 text-[0.6875rem] font-semibold text-ink backdrop-blur-sm tabular">
                Min {formatRupees(kitchen.min_order_minor)}
              </span>
            )}
          </div>

          <div className="p-3.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 truncate font-display text-[1.0625rem] font-bold leading-snug text-ink group-hover:text-brand">
                {kitchen.name}
              </h3>

              {/* Rating as a solid chip, not a bare number: it is the single
                  most-scanned element on a listing, so it gets weight. */}
              {kitchen.rating_count > 0 && (
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold tabular',
                    goodRating ? 'bg-veg text-on-veg' : 'bg-warning text-on-warning',
                  )}
                >
                  <Star className="size-3 fill-current" />
                  {kitchen.rating_average.toFixed(1)}
                </span>
              )}
            </div>

            {kitchen.cuisines.length > 0 && (
              <p className="mt-1 truncate text-sm text-ink-soft">
                {kitchen.cuisines.join(' · ')}
              </p>
            )}

            <div className="mt-2.5 flex items-center gap-3 border-t border-rule pt-2.5 text-xs text-ink-faint">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                <span className="tabular">{kitchen.avg_prep_minutes} min</span>
              </span>
              {distance_m !== undefined && (
                <span className="tabular">{formatDistance(distance_m)}</span>
              )}
            </div>
          </div>
        </Link>
      </Pressable>
    </li>
  )
}
