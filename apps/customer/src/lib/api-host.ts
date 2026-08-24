import { Platform } from 'react-native'
import Constants from 'expo-constants'

/**
 * Where the API lives, per platform. This is the single most common thing to get
 * wrong when moving from web to mobile, so it is written down rather than guessed.
 *
 * On the web, `localhost` means "this machine" and the browser IS on that machine.
 * On mobile it depends entirely on where the code is running:
 *
 *   iOS Simulator      shares the Mac's network stack, so localhost works.
 *   Android Emulator   is a VM. `localhost` is the EMULATOR itself, not the Mac.
 *                      10.0.2.2 is the magic address the emulator maps to its host.
 *   Real device        is a different machine on the wifi. It needs the Mac's LAN
 *                      IP — and both must be on the same network, which a phone on
 *                      mobile data is not.
 *
 * Getting this wrong produces "Network request failed" with no further detail, and
 * it looks identical to the server being down. Hence the diagnostics below.
 */

/** Set EXPO_PUBLIC_API_URL to override everything — for a staging or prod build. */
const EXPLICIT = process.env.EXPO_PUBLIC_API_URL

/**
 * The dev machine's LAN address, discovered rather than hardcoded.
 *
 * Expo already knows it: the packager tells the device where to fetch the bundle
 * from, and that host is by definition reachable from the device. Reading it here
 * means a phone works on any wifi without anybody editing a constant — and without
 * the classic failure where the IP changes and the app breaks for reasons nobody
 * connects to a router reboot.
 */
function packagerHost(): string | null {
  const url = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost
  if (!url) return null
  const host = url.split(':')[0]
  return host && host !== 'localhost' ? host : null
}

const API_PORT = 8080
const API_PATH = '/api/v1'

/**
 * The WEB app's port, which is a different service.
 *
 * Dish and kitchen photographs are stored as root-relative paths
 * (`/dishes/cover-mughlai.jpg`) and served from the Next app's public directory —
 * NOT by the Go API. Prefixing them with the API host gives a 404, which I did
 * before checking: :8080 does not serve those files, :3000 does.
 *
 * This is temporary and marked as such. Once images live in object storage the API
 * should return ABSOLUTE urls, and this constant disappears — a client having to
 * know which of two services hosts an asset is a leak of deployment topology into
 * the app.
 */
const WEB_PORT = 3000

export const API_BASE_URL: string = (() => {
  if (EXPLICIT) return EXPLICIT

  // A real device, or a simulator started from a LAN-hosted packager. This is
  // checked FIRST because it is correct in every case where it is available.
  const host = packagerHost()
  if (host) return `http://${host}:${API_PORT}${API_PATH}`

  if (Platform.OS === 'android') {
    // The emulator's alias for its host machine. Not a typo, not configurable.
    return `http://10.0.2.2:${API_PORT}${API_PATH}`
  }

  // iOS Simulator, and the last resort everywhere else.
  return `http://localhost:${API_PORT}${API_PATH}`
})()

/**
 * Where the images are. Same host resolution, different port.
 *
 * See WEB_PORT above for why this is separate from the API and why it should not
 * survive contact with real image hosting.
 */
export const ASSET_BASE_URL: string = (() => {
  if (EXPLICIT) return EXPLICIT.replace(/\/api\/v1\/?$/, '')
  const host = packagerHost()
  if (host) return `http://${host}:${WEB_PORT}`
  if (Platform.OS === 'android') return `http://10.0.2.2:${WEB_PORT}`
  return `http://localhost:${WEB_PORT}`
})()

/** Turns a root-relative image path from the API into something a phone can load. */
export function assetUrl(path: string): string {
  return path.startsWith('http') ? path : `${ASSET_BASE_URL}${path}`
}

/**
 * A human-readable explanation of the choice, for the dev screen.
 *
 * Worth building: when a request fails, the first question is "what did it even
 * try to reach". Printing that on screen turns a ten-minute confusion into a
 * glance, and it costs nothing to keep.
 */
export function describeApiHost(): string {
  if (EXPLICIT) return `EXPO_PUBLIC_API_URL override`
  if (packagerHost()) return `LAN address from the Expo packager`
  if (Platform.OS === 'android') return `Android emulator host alias (10.0.2.2)`
  return `localhost — iOS Simulator shares the Mac's network`
}
