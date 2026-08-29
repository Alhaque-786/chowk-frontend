import type { Metadata } from 'next'
import { OrderHistory } from '@/components/orders/order-history'

export const metadata: Metadata = {
  title: 'Your orders',
  description: 'Every order you have placed, newest first.',
  // Somebody else's order history is not a search result.
  robots: { index: false, follow: false },
}

/**
 * The customer's order history.
 *
 * The site header has linked here since it was written and this page did not exist,
 * so "Orders" in the nav was a 404 on every page of the site. The API endpoint was
 * missing too — the repository method existed and had never been exposed.
 */
export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink sm:text-[1.75rem]">
        Your orders
      </h1>
      <div className="mt-6">
        <OrderHistory />
      </div>
    </div>
  )
}
