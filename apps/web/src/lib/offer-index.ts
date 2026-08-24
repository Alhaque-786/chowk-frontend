import type { Offer } from './api/types'

/**
 * Groups offers by kitchen, so a listing card can show the offer that applies to
 * it — the blue strip across the bottom of the image that every reference design
 * (Zomato, Swiggy, magicpin) uses as its main density signal.
 *
 * Built once for a whole page rather than filtered per card. Filtering inside the
 * card component would be O(kitchens x offers) and, worse, would put the
 * empty-means-everywhere rule in a place where it gets forgotten.
 *
 * THE RULE, in one place: `kitchen_ids: []` means the offer applies to EVERY
 * kitchen. Reading an empty array as "applies to nothing" is the obvious mistake
 * and it hides every platform-wide offer, which are exactly the ones we most want
 * shown.
 */
export type OfferIndex = {
  /** The best offer to show for a kitchen, or undefined. */
  for: (kitchenId: string) => Offer | undefined
}

/**
 * Which offer wins when several apply.
 *
 * Lowest minimum order first: an offer you can already use beats a better one you
 * cannot. Then first-order offers deprioritised, since most viewers are not
 * first-time. This is a display heuristic and nothing depends on it being
 * optimal — the authoritative discount is computed at checkout.
 */
function better(a: Offer, b: Offer): Offer {
  if (a.min_order_minor !== b.min_order_minor) {
    return a.min_order_minor < b.min_order_minor ? a : b
  }
  if (a.first_order_only !== b.first_order_only) {
    return a.first_order_only ? b : a
  }
  return a
}

export function buildOfferIndex(offers: Offer[]): OfferIndex {
  const byKitchen = new Map<string, Offer>()
  let global: Offer | undefined

  for (const offer of offers) {
    // Defensive: `kitchen_ids` is a recent API addition, and an older backend
    // omits it. Treating undefined as global matches the field's own semantics
    // and is better than crashing a listing page over a missing array.
    const ids = offer.kitchen_ids ?? []

    if (ids.length === 0) {
      global = global ? better(global, offer) : offer
      continue
    }
    for (const id of ids) {
      const existing = byKitchen.get(id)
      byKitchen.set(id, existing ? better(existing, offer) : offer)
    }
  }

  return {
    for: (kitchenId) => {
      const specific = byKitchen.get(kitchenId)
      // A kitchen-specific offer beats a global one: it is more likely to be the
      // reason this kitchen is worth tapping.
      if (specific) return specific
      return global
    },
  }
}

/**
 * The strip's text. Short by necessity — it sits in a 2-line overlay on a photo.
 *
 * Uses the offer's own description when there is one, because a merchant wrote it
 * for customers. Falls back to the code, which is at least actionable.
 */
export function offerHeadline(offer: Offer): string {
  const text = offer.description.trim()
  if (text !== '') return text
  return `Use code ${offer.code}`
}
