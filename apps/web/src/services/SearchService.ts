import { cache } from 'react'
import CatalogService, { type DishWithKitchen } from './CatalogService'
import type { NearbyKitchen } from '@/lib/api/types'

/**
 * Search across kitchens and dishes.
 *
 * NOT a backend module, and that is the point worth reading. The API has
 * `GET /kitchens/{id}/search`, which searches WITHIN one kitchen — there is no
 * cross-kitchen search endpoint. So this composes what exists: it fetches the
 * nearby kitchens, filters them locally on name and cuisine, and scans a CAPPED
 * number of their menus for matching dishes.
 *
 * THE LIMITS, stated rather than discovered later:
 *
 *   - Menu scanning is capped, because it costs one request per kitchen. At ten
 *     kitchens that is fine and at two hundred it is a page that takes longer to
 *     search than to read.
 *   - Matching is substring, case-insensitive. No stemming, no synonyms, no
 *     typo tolerance — "biriyani" will not find "biryani", and a customer who
 *     misspells a dish gets nothing.
 *   - Only kitchens within the delivery radius are searched, which is correct
 *     for ordering and wrong for "does this dish exist anywhere".
 *
 * The real fix is a server-side search endpoint over a text index, which the
 * schema can already support — menu_items has name and description, and Postgres
 * full-text search would handle stemming and ranking properly. Worth building
 * before supply grows; until then this is honest and it works.
 */

export type SearchResults = {
  query: string
  kitchens: NearbyKitchen[]
  dishes: DishWithKitchen[]
}

/** How many kitchens' menus to scan. See the cap discussion above. */
const MENU_SCAN_LIMIT = 6

function normalise(text: string): string {
  return text.trim().toLowerCase()
}

export const search = cache(
  async (query: string, lat: number, lng: number): Promise<SearchResults> => {
    const q = normalise(query)
    if (q === '') return { query, kitchens: [], dishes: [] }

    const nearby = await CatalogService.findNearby(lat, lng, 15000)

    const kitchens = nearby.filter(
      (k) =>
        normalise(k.name).includes(q) ||
        k.cuisines.some((c) => normalise(c).includes(q)),
    )

    // Scan menus for dish matches. Open kitchens first, so if the cap bites it
    // drops the kitchens a customer cannot order from anyway.
    const candidates = [...nearby]
      .sort((a, b) => Number(b.is_open) - Number(a.is_open))
      .slice(0, MENU_SCAN_LIMIT)

    const menus = await Promise.all(candidates.map((k) => CatalogService.getMenu(k.id)))

    const dishes: DishWithKitchen[] = []
    menus.forEach((menu, i) => {
      if (!menu) return
      const kitchen = candidates[i]
      for (const category of menu.categories) {
        for (const item of category.items) {
          if (
            normalise(item.name).includes(q) ||
            normalise(item.description ?? '').includes(q) ||
            normalise(category.name).includes(q)
          ) {
            dishes.push({ item, kitchenId: kitchen.id, kitchenName: kitchen.name })
          }
        }
      }
    })

    // A name match outranks a description match: someone searching "biryani"
    // wants the dish called biryani, not the korma whose blurb mentions it.
    dishes.sort((a, b) => {
      const aName = normalise(a.item.name).includes(q)
      const bName = normalise(b.item.name).includes(q)
      if (aName !== bName) return aName ? -1 : 1
      return Number(b.item.is_recommended) - Number(a.item.is_recommended)
    })

    return { query, kitchens, dishes }
  },
)

const SearchService = { search }
export default SearchService
