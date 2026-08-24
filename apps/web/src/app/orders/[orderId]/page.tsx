import type { Metadata } from 'next'
import { OrderView } from '@/components/orders/order-view'

/**
 * One order, tracked.
 *
 * A Client Component underneath, for the same reason as the cart: the order is
 * behind a bearer token in localStorage, and status changes while the customer
 * watches. Nothing here is indexable.
 */
export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
}

export default async function OrderPage({
  params,
}: {
  // `params` is a Promise in this version of Next and must be awaited.
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <OrderView orderId={orderId} />
    </div>
  )
}
