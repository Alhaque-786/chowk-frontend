/**
 * API types for the mobile app.
 *
 * Hand-written for now, and the drift risk is real and documented: the web app hit
 * SIX type drifts against this same API — `line_id` vs `id`, a Cart missing six of
 * ten fields, `item_count` vs `lines.length`, a wrongly-removed `modifiers`, an
 * `is_available` that does not exist, and an Address missing three fields.
 * TypeScript caught none of them, because it checks code against assumptions rather
 * than against the server.
 *
 * So this file is a placeholder for generated types, not a home for them. The fix
 * is `openapi.json` from the Go handlers feeding a generated package — which also
 * works for Dart, and cannot drift. Every field below was read off a live response.
 */

export type Kitchen = {
  id: string
  name: string
  slug: string
  description?: string
  cuisines: string[]
  city: string
  latitude: number
  longitude: number
  /** The JSON tag is `is_open`, NOT the Go method name. The web app guessed wrong
   *  once and every kitchen rendered as closed. */
  is_open: boolean
  closed_reason?: string
  avg_prep_minutes: number
  rating_average: number
  rating_count: number
  min_order_minor: number
  packaging_fee_minor: number
  /** Absent when the merchant has not set one — render nothing, never "₹0". */
  cost_for_two_minor?: number
  cover_image_url?: string
  /** Straight-line metres. Absent when the search had no origin. */
  distance_m?: number
}
