'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * The query client for client-side data that must stay fresh.
 *
 * WHY THIS ARRIVED LATE, and where it should and should not be used. This app is
 * server-rendered: menus, listings and offers are fetched on the server, which is
 * what makes them indexable and keeps the API token off the client. None of that
 * needs a query client and none of it should get one.
 *
 * What does need one is the handful of screens that POLL — an order status a
 * customer is watching, a kitchen queue during service. Those were written as
 * `useEffect` plus `setState`, and there are now four
 * `eslint-disable react-hooks/set-state-in-effect` suppressions in this codebase
 * marking the same piece of debt four times. The mobile app started with a query
 * library for exactly this reason; the comments in apps/customer/src/lib/query.ts
 * name it as the real fix.
 *
 * CREATED PER MOUNT INSIDE useState, not as a module-level singleton. On the server
 * a module singleton is shared across REQUESTS, so one user's cached data can be
 * served to the next — a data leak that only shows up under concurrency.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            /*
              Zero, unlike the mobile app's 30 seconds, and the difference is what
              this client is for here. Everything cacheable is already cached on the
              server; what reaches this client is the polling cases, where a stale
              read is a customer watching a status that has already changed.
            */
            staleTime: 0,
            retry: (failureCount, error) => {
              // A 4xx is the caller's fault and fails identically forever. Retrying
              // delays the error and doubles the load.
              const status = (error as { status?: number }).status
              if (typeof status === 'number' && status >= 400 && status < 500) return false
              return failureCount < 2
            },
            // A tab returning to the foreground should show current state, not a
            // snapshot from before somebody took a phone call.
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
