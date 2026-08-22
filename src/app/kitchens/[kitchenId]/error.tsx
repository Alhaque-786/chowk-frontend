'use client'

import { Button } from '@/components/ui/button'

/**
 * Shown when the menu genuinely fails to load.
 *
 * Deliberately does NOT show the error text: a customer cannot act on
 * "ECONNREFUSED", and the backend's internal messages are not written for them.
 * `reset()` re-runs the render, which is the right affordance for a transient
 * failure.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-4">
      {/* Spacing via the column's gap rather than margins on each child:
          sibling margins collapse and double in ways gap does not. */}
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <h1 className="font-display text-xl font-semibold text-ink">
          Could not load this menu
        </h1>
        <p className="text-sm text-ink-soft">
          The connection dropped or the kitchen is briefly unreachable. Trying
          again usually works.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  )
}
