import { cache } from 'react'
import { ApiError, request } from './client'
import type { Menu, MenuItem, NearbyKitchen, Offer } from './types'

/**
 * Data fetchers shared between `generateMetadata` and the page body.
 *
 * Wrapped in React's `cache` so calling them twice per request executes once.
 * Without it, every page with generated metadata fetches its data twice — the
 * title needs the kitchen name, the body needs the same menu — and the duplicate
 * is invisible until you read the access log.
 *
 * `cache` is scoped to a single request, so this is deduplication, not caching.
 * The HTTP cache lifetime is the `revalidate` option on each call.
 */

/** Menu for one kitchen. Returns null on 404 so callers can render notFound(). */
export const getMenu = cache(async (kitchenId: string): Promise<Menu | null> => {
  try {
    return await request<Menu>(`/kitchens/${kitchenId}/menu`, {
      auth: false,
      // The hottest read in the system, and it changes rarely. 60s is short
      // enough that a price change surfaces quickly; the backend also
      // invalidates its own cache on write, so this is the outer layer.
      revalidate: 60,
    })
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    // Anything else is a real failure. Rethrowing lets error.tsx handle it
    // rather than rendering an empty menu as though the kitchen had no food.
    throw err
  }
})

/**
 * Kitchens near a point.
 *
 * Falls back to an empty list rather than throwing: a home page that renders
 * with no kitchens is degraded but usable, where one that throws is a blank
 * screen. The distinction matters because this is the first thing anyone sees.
 */
export const getNearbyKitchens = cache(
  async (lat: number, lng: number, radiusM = 10000): Promise<NearbyKitchen[]> => {
    try {
      const result = await request<{ kitchens: NearbyKitchen[] }>(
        // `/kitchens/nearby`, not `/kitchens?lat=`. The first version of this
        // used the wrong path, got a 404, and the catch below turned it into an
        // empty list -- so a broken call rendered as a plausible "nothing
        // nearby". Verified against the running API.
        `/kitchens/nearby?lat=${lat}&lng=${lng}&radius_m=${radiusM}`,
        { auth: false, revalidate: 120 },
      )
      return result.kitchens ?? []
    } catch (err) {
      // A 404 here means the ROUTE is wrong, not that there are no kitchens.
      // Rethrowing in development makes that loud; in production a missing rail
      // still beats a blank page.
      if (
        process.env.NODE_ENV !== 'production' &&
        err instanceof ApiError &&
        err.status === 404
      ) {
        throw new Error(
          `getNearbyKitchens got 404 — the endpoint path is wrong, not empty. ${err.message}`,
        )
      }
      return []
    }
  },
)

/** Live offers. Also degrades to empty — a missing offers rail is not an error. */
export const getOffers = cache(async (kitchenId?: string): Promise<Offer[]> => {
  try {
    const query = kitchenId ? `?kitchen_id=${kitchenId}` : ''
    const result = await request<{ offers: Offer[] }>(`/offers${query}`, {
      auth: false,
      revalidate: 300,
    })
    return result.offers ?? []
  } catch {
    return []
  }
})

/** A dish plus the kitchen it belongs to, for cross-kitchen rails. */
export type DishWithKitchen = {
  item: MenuItem
  kitchenId: string
  kitchenName: string
}

/**
 * Popular dishes across nearby kitchens.
 *
 * Assembled client-side from each kitchen's menu because the API has no
 * cross-kitchen dish endpoint. That is a real limitation, not a preference: it
 * costs one request per kitchen, so the kitchen count is CAPPED rather than
 * unbounded — fanning out over fifty kitchens to fill one rail would make the
 * home page slower than the menu it is advertising.
 *
 * The proper fix is a `GET /dishes/popular` endpoint that ranks server-side using
 * the `order_count` column that already exists on menu_items. Worth doing before
 * there are more than a handful of kitchens.
 */
export const getPopularDishes = cache(
  async (kitchens: NearbyKitchen[], limit = 12): Promise<DishWithKitchen[]> => {
    // Open kitchens only: a rail advertising food you cannot order is worse than
    // a shorter rail.
    const candidates = kitchens.filter((k) => k.is_open).slice(0, 3)
    if (candidates.length === 0) return []

    const menus = await Promise.all(candidates.map((k) => getMenu(k.id)))

    const dishes: DishWithKitchen[] = []
    menus.forEach((menu, i) => {
      if (!menu) return
      const kitchen = candidates[i]
      for (const category of menu.categories) {
        for (const item of category.items) {
          dishes.push({ item, kitchenId: kitchen.id, kitchenName: kitchen.name })
        }
      }
    })

    // Recommended first, then by rating, then by review volume. Ordering by
    // rating alone would float a single five-star review above a dish with
    // hundreds.
    return dishes
      .sort((a, b) => {
        const rec = Number(b.item.is_recommended) - Number(a.item.is_recommended)
        if (rec !== 0) return rec
        const rating = b.item.rating_average - a.item.rating_average
        if (rating !== 0) return rating
        return b.item.rating_count - a.item.rating_count
      })
      .slice(0, limit)
  },
)
