import { QueryClient } from '@tanstack/react-query'

/**
 * The query client, configured once.
 *
 * WHY A DATA LIBRARY AND NOT useEffect. The web app fetches in effects and carries
 * two eslint suppressions for `react-hooks/set-state-in-effect` because of it. The
 * comments there name this as the real fix rather than the suppression — so the
 * mobile app starts with it instead of inheriting the debt.
 *
 * What it removes, concretely: the effect, the AbortController plumbing, the
 * `loaded` flag, the abort-is-not-an-error branch, and the "did this resolve into
 * an unmounted component" question. Roughly thirty lines per screen that were all
 * infrastructure rather than product.
 *
 * What it adds that hand-rolling did not have: deduplication of identical requests
 * in flight, cached data shown instantly on revisit while refetching behind it,
 * and retry with backoff.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /*
        30 seconds, matching the web app's `revalidate` on the same endpoint — and
        for the same reason. The kitchen LIST changes rarely, but the response
        carries `is_open`, computed per request from opening hours. Cache lifetime
        is set by the most time-sensitive field in a payload, not the least.
      */
      staleTime: 30_000,

      /*
        Two retries, not the default three, and never on a 4xx.

        A 4xx is the caller's fault and will fail identically forever, so retrying
        it just delays the error and doubles the load. On a phone that also means
        two pointless round trips on a bad connection before the customer is told
        anything.
      */
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status
        if (typeof status === 'number' && status >= 400 && status < 500) return false
        return failureCount < 2
      },

      /*
        Refetch when the app returns to the foreground, NOT on every window focus.
        A phone is backgrounded constantly, and a customer coming back to a menu
        after two minutes should see current open/closed state rather than a
        snapshot from before they took a call.
      */
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
})
