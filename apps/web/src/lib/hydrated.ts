'use client'

import { useSyncExternalStore } from 'react'

/** Subscribing to nothing: this value changes exactly once, at hydration. */
const noStore = () => () => {}

/**
 * Whether the client has taken over from the server-rendered HTML.
 *
 * Anything read from localStorage is unknowable during server rendering, so the first
 * paint necessarily shows a signed-out page. Without this flag a signed-in person sees
 * that signed-out page for a frame — "please sign in" flashing in front of somebody who
 * plainly is signed in.
 *
 * Written with useSyncExternalStore rather than the usual useState + useEffect pair, and
 * not for elegance: setting state in an effect is what react-hooks/set-state-in-effect
 * exists to catch, and this app already carries four suppressions of that rule. The
 * server snapshot is false, the client snapshot is true, React swaps them at hydration,
 * and no effect ever runs.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noStore,
    () => true,
    () => false,
  )
}
