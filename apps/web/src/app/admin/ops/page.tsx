import type { Metadata } from 'next'
import { OpsDashboard } from '@/components/queue/ops-dashboard'

export const metadata: Metadata = {
  title: 'Ops queue',
  robots: { index: false, follow: false },
}

/**
 * The platform's queue for vendors who cannot action their own orders.
 *
 * An assisted vendor — a cart selling fresh nariyal pani is the case this exists
 * for — has no dashboard and never signs in. Without this screen his orders sit at
 * `placed` until they time out, and the customer is told the kitchen never
 * responded, which is true and entirely our fault for listing him.
 */
export default function OpsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* See the note in /kitchen: the h1 belongs to the document, not to whether
          the role gate lets this person see the queue. */}
      <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink sm:text-[1.75rem]">
        Vendor order queue
      </h1>
      <div className="mt-6">
        <OpsDashboard />
      </div>
    </div>
  )
}
