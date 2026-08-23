import type { Metadata } from 'next'
import { AccountView } from '@/components/account/account-view'

/**
 * The customer's account: who they are, where they live, and the way out.
 *
 * A Client Component underneath, like the cart, because everything on it is
 * behind a bearer token held in localStorage. Nothing here is indexable.
 */
export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
}

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        Your account
      </h1>
      <AccountView />
    </div>
  )
}
