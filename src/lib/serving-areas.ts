/**
 * Where we actually deliver.
 *
 * This is CONFIGURATION, deliberately in its own module, and it replaces a
 * `const CITY = 'Lucknow'` that was sitting in the middle of the home page. The
 * difference is not cosmetic:
 *
 *   - A constant inside a page is invisible. Nobody grepping for "which cities
 *     are we live in" finds a page component, so the answer to a business
 *     question lived somewhere only a frontend developer would look.
 *   - It was used as BOTH the display name and the search centre, so launching a
 *     second city meant editing rendering code.
 *   - There was no way to express "we serve three cities" at all.
 *
 * The real end state is that this comes from the backend — the kitchens table
 * already has coordinates, so the set of served areas is derivable rather than
 * declared. It is a file for now because a launch-city list changes a few times a
 * year and an endpoint for it would be premature. Called out so it is a known
 * step, not a forgotten one.
 */

export type ServingArea = {
  /** Stable key, used in the cookie. Never renamed, or saved locations break. */
  slug: string
  city: string
  state: string
  /** Search centre. Not the geometric centre — the point most orders come from. */
  lat: number
  lng: number
}

export const SERVING_AREAS: readonly ServingArea[] = [
  { slug: 'lucknow', city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.85, lng: 80.947 },
] as const

/**
 * The area assumed for a visitor who has not told us where they are.
 *
 * The FIRST entry, not a separately declared default, so the two cannot fall out
 * of step. A visitor seeing this has not chosen it, and the UI says so rather
 * than presenting a guess as a decision.
 */
export const DEFAULT_AREA = SERVING_AREAS[0]

export function findArea(slug: string): ServingArea | undefined {
  return SERVING_AREAS.find((a) => a.slug === slug)
}
