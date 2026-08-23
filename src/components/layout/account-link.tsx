'use client'

import Link from 'next/link'
import { CircleUserRound } from 'lucide-react'
import { requireAuth, useIsSignedIn } from '@/lib/auth-gate'

/**
 * The account entry point in the header.
 *
 * Shows nothing until somebody is signed in — an "Account" link that only offers a
 * sign-in prompt is a dead end on a page where the customer has not asked to sign
 * in yet. Signing in from an add-to-cart, where there IS a reason, is a better
 * first prompt.
 *
 * A separate client island rather than making the whole header client. The header
 * is otherwise entirely server-rendered, and this is the only part of it that
 * depends on session state.
 */
export function AccountLink() {
  const signedIn = useIsSignedIn()

  if (!signedIn) {
    return (
      <button
        type="button"
        onClick={() => void requireAuth('Sign in to see your orders and addresses.')}
        className="hidden rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:inline-flex"
      >
        Sign in
      </button>
    )
  }

  return (
    <Link
      href="/account"
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      aria-label="Your account"
    >
      <CircleUserRound className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">Account</span>
    </Link>
  )
}
