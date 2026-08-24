import { cookies } from 'next/headers'

import {
  LOCATION_COOKIE,
  parseLocation,
  fallbackLocation,
  type DeliveryLocation,
} from './location'

/**
 * Reads the chosen delivery location on the server.
 *
 * SEPARATE FILE because `cookies()` is server-only and importing it — even
 * indirectly, even for an unrelated constant — fails the build for any Client
 * Component downstream. That is exactly what happened: the address form needed
 * the cookie's name, imported it from the location module, and pulled
 * `next/headers` into the browser bundle.
 *
 * The rule this leaves behind: a module containing a server-only import can only
 * ever be imported by server code. Anything shared with the client belongs in a
 * pure module, which is what `location.ts` now is.
 *
 * Consequence unchanged: reading cookies opts a route into dynamic rendering, so
 * call this inside a Suspense boundary and the static shell still streams first.
 */
export async function getDeliveryLocation(): Promise<DeliveryLocation> {
  const store = await cookies()
  const raw = store.get(LOCATION_COOKIE)?.value
  if (!raw) return fallbackLocation()
  return parseLocation(raw) ?? fallbackLocation()
}
