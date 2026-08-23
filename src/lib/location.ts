import { cookies } from 'next/headers'
import { DEFAULT_AREA, findArea, type ServingArea } from './serving-areas'

/**
 * The delivery point every location-aware query is centred on.
 *
 * WHY A COOKIE. The choice has to be readable on the SERVER, because the kitchen
 * list is server-rendered — that is what makes it indexable and what keeps the
 * API token off the client. localStorage cannot be read during rendering, and a
 * query parameter would mean every internal link had to carry the location or
 * silently lose it. A cookie is the one mechanism the server sees on the first
 * request, with no round trip and no flash of wrong content.
 *
 * NOT httpOnly, deliberately: client components need to read the current label to
 * render the picker without waiting for a server round trip. There is nothing
 * sensitive in it — a coarse delivery area the customer chose and is looking at.
 *
 * CONSEQUENCE, stated plainly: reading cookies opts a route into dynamic
 * rendering. A location-aware kitchen list cannot also be a static page, so this
 * is read inside the Suspense-wrapped sections rather than at the top of the
 * page — the static hero still streams first and the LCP element is unaffected.
 */

export const LOCATION_COOKIE = 'chowk.loc'

/** A year. The choice is a stable preference, not a session detail. */
export const LOCATION_MAX_AGE = 60 * 60 * 24 * 365

export type DeliveryLocation = {
  lat: number
  lng: number
  /** What to show the customer: a city, or their address label. */
  label: string
  /**
   * True when nobody chose this and we fell back to the launch city.
   *
   * The UI MUST distinguish these. Showing a guess with the same confidence as a
   * choice is how someone in Kanpur browses Lucknow kitchens for ten minutes
   * before working out why nothing can reach them.
   */
  isFallback: boolean
}

/** Serialises for the cookie. `|` because a label can contain a comma. */
export function encodeLocation(lat: number, lng: number, label: string): string {
  return `${lat.toFixed(5)}|${lng.toFixed(5)}|${label}`
}

/**
 * Parses the cookie, rejecting anything malformed.
 *
 * A cookie is client-writable, so this is untrusted input. Coordinates outside
 * real bounds, non-numbers, or a missing label all fall back rather than being
 * passed to the API — a NaN in a `lat` query parameter is a 400 on the most
 * important request the page makes.
 */
function parseLocation(raw: string): DeliveryLocation | null {
  const parts = raw.split('|')
  if (parts.length < 3) return null

  const lat = Number(parts[0])
  const lng = Number(parts[1])
  // The label may itself contain `|` after a rejoin; take the remainder.
  const label = parts.slice(2).join('|').trim()

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null
  if (label === '' || label.length > 120) return null

  return { lat, lng, label, isFallback: false }
}

function fallback(): DeliveryLocation {
  return {
    lat: DEFAULT_AREA.lat,
    lng: DEFAULT_AREA.lng,
    label: DEFAULT_AREA.city,
    isFallback: true,
  }
}

/**
 * The current delivery location. Never throws, always returns something usable.
 *
 * Falling back rather than prompting is deliberate: a first-time visitor should
 * see food immediately. Asking for a location before showing anything is the
 * most reliable way to lose someone who is only browsing.
 */
export async function getDeliveryLocation(): Promise<DeliveryLocation> {
  const store = await cookies()
  const raw = store.get(LOCATION_COOKIE)?.value
  if (!raw) return fallback()
  return parseLocation(raw) ?? fallback()
}

/** The serving area matching a slug, for the picker's list. */
export function areaFor(slug: string): ServingArea | undefined {
  return findArea(slug)
}
