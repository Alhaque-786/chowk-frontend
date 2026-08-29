import type { Metadata } from 'next'
import { KitchenDashboard } from '@/components/queue/kitchen-dashboard'

export const metadata: Metadata = {
  title: 'Kitchen dashboard',
  // Staff tooling has no business in a search index, and a queue page would rank
  // for the kitchen's own name.
  robots: { index: false, follow: false },
}

/**
 * The merchant's order queue.
 *
 * The surface without which a merchant on this platform cannot operate: orders
 * arrive and nobody can accept them. It did not exist — the backend has gated
 * kitchen routes for accept, start, ready, handover, delivered and reject, and
 * nothing on the web called any of them.
 *
 * A CLIENT COMPONENT, unlike every customer-facing page here. Those are server
 * rendered so they are indexable and so the API token stays server-side. This one
 * is neither indexable nor cacheable: it polls, it is behind a login, and its whole
 * value is being current.
 */
export default function KitchenPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/*
        THE H1 LIVES HERE, not inside the dashboard, and that is not cosmetic. When
        the role gate refuses — wrong account, or an account not linked to an outlet —
        the client component renders an explanation instead of the queue, and the page
        was shipping with NO h1 at all. Verified against the served HTML: zero.

        A heading is a property of the document, not of whether the reader is allowed
        to see the contents.
      */}
      <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink sm:text-[1.75rem]">
        Kitchen dashboard
      </h1>
      <div className="mt-6">
        <KitchenDashboard />
      </div>
    </div>
  )
}
