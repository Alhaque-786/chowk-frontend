import { cache } from 'react'
import { api, type CallOptions } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'
import type { Kitchen, Menu, MenuItem, NearbyKitchen } from '@/lib/api/types'

/**
 * Kitchens and their menus — the `catalog` backend module.
 *
 * Every method here is a public read: no auth, and safe to call for an anonymous
 * visitor. That is why they are `cache`-wrapped and carry `revalidate` values;
 * these are the hottest and most cacheable calls in the product.
 *
 * Each method sets its own `revalidate` and then spreads `options` after it, so
 * the default is right without thinking and a caller can still override — an
 * admin screen wanting fresh data passes `{ revalidate: 0 }`, a build step wanting
 * patience passes `{ retry: 5 }`. Defaults first, caller last.
 */

/** A dish plus the kitchen it belongs to, for cross-kitchen rails. */
export type DishWithKitchen = {
  item: MenuItem
  kitchenId: string
  kitchenName: string
}

const CatalogService = {
  /**
   * Kitchens near a point.
   *
   * Degrades to an empty list rather than throwing: a home page with no kitchens
   * is usable, one that throws is a blank screen, and this is the first thing
   * anyone sees.
   */
  findNearby: cache(
    async (
      lat: number,
      lng: number,
      radiusM = 10000,
      options?: CallOptions,
    ): Promise<NearbyKitchen[]> => {
      try {
        const result = await api.get<{ kitchens: NearbyKitchen[] }>(
          // `/kitchens/nearby`, not `/kitchens?lat=`. The first version used the
          // wrong path, got a 404, and the catch below turned it into an empty
          // list -- so a broken call rendered as a plausible "nothing nearby".
          // Verified against the running API.
          `/kitchens/nearby?lat=${lat}&lng=${lng}&radius_m=${radiusM}`,
          /*
            30s, not 120s.

            The kitchen LIST changes rarely, which is what 120 was chosen for. But
            the response also carries `is_open`, which is computed per request from
            opening hours — so a kitchen that has just closed kept showing as open,
            and kept its place in the open-first ordering, for up to two minutes.
            Cache lifetime has to be set by the most time-sensitive field in a
            payload, not the least.
          */
          { auth: false, revalidate: 30, ...options },
        )
        return result.kitchens ?? []
      } catch (err) {
        // A 404 here means the ROUTE is wrong, not that there are no kitchens.
        // Loud in development; in production a missing rail still beats a blank
        // page.
        if (
          process.env.NODE_ENV !== 'production' &&
          err instanceof ApiError &&
          err.status === 404
        ) {
          throw new Error(
            `CatalogService.findNearby got 404 — the endpoint path is wrong, not empty. ${err.message}`,
          )
        }
        return []
      }
    },
  ),

  /** One kitchen. Null on 404 so the caller can render notFound(). */
  getKitchen: cache(async (kitchenId: string, options?: CallOptions): Promise<Kitchen | null> => {
    try {
      return await api.get<Kitchen>(`/kitchens/${kitchenId}`, {
        auth: false,
        revalidate: 120,
        ...options,
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }
  }),

  /** Menu for one kitchen. Null on 404 so the caller can render notFound(). */
  getMenu: cache(async (kitchenId: string, options?: CallOptions): Promise<Menu | null> => {
    try {
      return await api.get<Menu>(`/kitchens/${kitchenId}/menu`, {
        auth: false,
        // The hottest read in the system, and it changes rarely. 60s is short
        // enough that a price change surfaces quickly; the backend also
        // invalidates its own cache on write, so this is the outer layer.
        revalidate: 60,
        ...options,
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      // Anything else is a real failure. Rethrowing lets error.tsx handle it
      // rather than rendering an empty menu as though the kitchen had no food.
      throw err
    }
  }),

  /** Dish search within one kitchen. Empty on failure — a search box that errors
   *  out is worse than one that finds nothing. */
  searchItems: cache(
    async (kitchenId: string, query: string): Promise<MenuItem[]> => {
      if (query.trim() === '') return []
      try {
        const result = await api.get<{ items: MenuItem[] }>(
          `/kitchens/${kitchenId}/search?q=${encodeURIComponent(query)}`,
          { auth: false, revalidate: 60 },
        )
        return result.items ?? []
      } catch {
        return []
      }
    },
  ),

  /**
   * Popular dishes across nearby kitchens.
   *
   * Assembled here from each kitchen's menu because the API has no cross-kitchen
   * dish endpoint. That is a real limitation, not a preference: it costs one
   * request per kitchen, so the kitchen count is CAPPED rather than unbounded —
   * fanning out over fifty kitchens to fill one rail would make the home page
   * slower than the menu it is advertising.
   *
   * The proper fix is `GET /dishes/popular`, ranking server-side on the
   * `order_count` column that already exists on menu_items. Worth doing before
   * there are more than a handful of kitchens.
   */
  getPopularDishes: cache(
    async (kitchens: NearbyKitchen[], limit = 12): Promise<DishWithKitchen[]> => {
      // Open kitchens only: a rail advertising food you cannot order is worse
      // than a shorter rail.
      const candidates = kitchens.filter((k) => k.is_open).slice(0, 3)
      if (candidates.length === 0) return []

      const menus = await Promise.all(
        candidates.map((k) => CatalogService.getMenu(k.id)),
      )

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

      // Recommended first, then rating, then review volume. Ordering by rating
      // alone would float a single five-star review above a dish with hundreds.
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
  ),
}

export default CatalogService
