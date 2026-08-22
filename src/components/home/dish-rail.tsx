import Link from 'next/link'
import { Star } from 'lucide-react'
import { DishImage } from '@/components/ui/dish-image'
import { FoodMark } from '@/components/ui/food-mark'
import { Pressable } from '@/components/ui/reveal'
import { formatRupees } from '@/lib/format'
import type { DishWithKitchen } from '@/lib/api/queries'

/**
 * A rail of actual dishes with actual prices.
 *
 * This is what makes a food home page feel like one. A page of restaurant cards
 * is a directory; a page showing the biryani and what it costs is a menu, and
 * that is what someone deciding what to eat is looking for.
 *
 * Every card links to its dish's kitchen rather than opening a sheet here —
 * ordering needs the kitchen's context (minimum order, open hours, delivery
 * reach), and adding to a cart from a rail would skip all of it.
 */
export function DishRail({
  dishes,
  title,
}: {
  dishes: DishWithKitchen[]
  title: string
}) {
  if (dishes.length === 0) return null

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <ul className="flex gap-3">
          {dishes.map(({ item, kitchenId, kitchenName }) => (
            <li key={`${kitchenId}-${item.id}`} className="w-[10.5rem] shrink-0">
              <Pressable>
                <Link
                  href={`/kitchens/${kitchenId}`}
                  className="group block overflow-hidden rounded-lg border border-rule bg-surface shadow-sm transition-shadow hover:shadow"
                >
                  <DishImage
                    name={item.name}
                    src={item.image_url}
                    foodType={item.food_type}
                    className="aspect-square w-full transition-transform duration-500 group-hover:scale-[1.04]"
                    sizes="168px"
                  />

                  <div className="p-2.5">
                    <div className="flex items-center gap-1.5">
                      <FoodMark type={item.food_type} />
                      {item.rating_count > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[0.6875rem] font-semibold text-ink-soft tabular">
                          <Star className="size-2.5 fill-current text-veg" />
                          {item.rating_average.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-1 truncate font-display text-sm font-bold leading-snug text-ink group-hover:text-brand">
                      {item.name}
                    </h3>

                    {/* The kitchen name matters here in a way it does not on a
                        menu page: this rail mixes kitchens, so without it the
                        dish has no provenance. */}
                    <p className="truncate text-[0.6875rem] text-ink-faint">
                      {kitchenName}
                    </p>

                    <p className="mt-1.5 text-sm font-bold text-ink tabular">
                      {formatRupees(item.price_minor)}
                    </p>
                  </div>
                </Link>
              </Pressable>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
