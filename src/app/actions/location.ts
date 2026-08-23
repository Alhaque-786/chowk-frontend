'use server'

import { revalidatePath } from 'next/cache'
import {
  LOCATION_COOKIE,
  LOCATION_MAX_AGE,
  encodeLocation,
} from '@/lib/location'
import { cookies } from 'next/headers'
import { findArea } from '@/lib/serving-areas'

/**
 * Server Functions for choosing a delivery location.
 *
 * These have to be Server Functions rather than a client-side `document.cookie`
 * write, for a reason worth stating: HTTP does not allow setting cookies once a
 * response has started streaming, so a Server Component cannot set one. And a
 * client-side write would not be visible to the server until the NEXT
 * navigation, so the customer would change city and see the old city's kitchens
 * until they clicked something. Setting it in an action, which then re-renders
 * the route, makes the change take effect on the same interaction.
 *
 * Both actions revalidate `/` explicitly. The route is already dynamic, but the
 * underlying `fetch` calls are cached by `revalidate`, and the nearby-kitchens
 * URL changes with the coordinates — so a new location is a cache MISS and
 * fetches fresh. The revalidate call covers the case of returning to a location
 * visited within the window, where the cached response would otherwise be served
 * with stale open/closed state.
 */

/** Picks one of the declared serving areas. */
export async function chooseServingArea(slug: string): Promise<void> {
  const area = findArea(slug)
  // Unknown slug is ignored rather than defaulted. A silent fallback to Lucknow
  // would make a bug look like a working feature.
  if (!area) return

  const store = await cookies()
  store.set(LOCATION_COOKIE, encodeLocation(area.lat, area.lng, area.city), {
    maxAge: LOCATION_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    // Readable by client components, which render the picker's current label.
    // Nothing sensitive: a coarse area the customer chose and can see.
    httpOnly: false,
  })
  revalidatePath('/')
}

/**
 * Stores coordinates from the browser's geolocation API, or a saved address.
 *
 * Validated here as well as in the parser. A Server Function is a public HTTP
 * endpoint — the client-side check before this call is a convenience, not a
 * guard, and anything reaching the API must be checked on this side of the wire.
 */
export async function choosePreciseLocation(
  lat: number,
  lng: number,
  label: string,
): Promise<void> {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return

  const clean = label.trim().slice(0, 120)
  if (clean === '') return

  const store = await cookies()
  store.set(LOCATION_COOKIE, encodeLocation(lat, lng, clean), {
    maxAge: LOCATION_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  })
  revalidatePath('/')
}
