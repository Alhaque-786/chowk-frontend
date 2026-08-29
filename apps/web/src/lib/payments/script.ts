/**
 * Loads a third-party script once, however many times it is asked for.
 *
 * Payment SDKs are loaded on demand rather than in the document head, because a
 * customer browsing kitchens should not pay for a gateway's JavaScript they may
 * never reach. That means the load happens at the worst possible moment -- the
 * customer has decided to pay -- so it has to be reliable rather than merely
 * short.
 *
 * The promise is cached per URL. Without it, a double-tap on "Pay" injects two
 * script tags and races: two SDK instances, two checkout modals, and the second
 * one has no handler attached.
 */
const loading = new Map<string, Promise<void>>()

export function loadScript(src: string): Promise<void> {
  const cached = loading.get(src)
  if (cached) return cached

  const promise = new Promise<void>((resolve, reject) => {
    // Already in the document from a previous mount: resolve rather than adding
    // a second tag. This happens on a client-side navigation back to the cart.
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }

    const el = document.createElement('script')
    el.src = src
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => {
      // Drop the cache so a retry can genuinely retry. A failed load left in the
      // map would make every later attempt fail instantly with a stale rejection
      // — the customer taps "Pay" again on a recovered connection and nothing
      // even tries.
      loading.delete(src)
      reject(new Error(`Could not load ${src}`))
    }
    document.head.appendChild(el)
  })

  loading.set(src, promise)
  return promise
}
