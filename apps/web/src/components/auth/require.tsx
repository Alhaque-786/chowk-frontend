'use client'

import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useSession, type Capability } from '@/lib/access'
import { useHydrated } from '@/lib/hydrated'

/**
 * Renders children only for somebody who may see them.
 *
 * ONE MORE TIME, BECAUSE THIS IS THE FILE PEOPLE WILL TRUST: this is not access
 * control. It reads a session out of localStorage and anybody can edit that. What it
 * controls is what a person is SHOWN, and the reason to centralise it is that the
 * refusals were being hand-written per page and drifting.
 *
 * FOUR DISTINCT OUTCOMES, because they have four different fixes and one generic
 * "access denied" leaves every one of these people stuck:
 *
 *   not hydrated yet  → say nothing; we genuinely do not know who is asking
 *   signed out        → offer a sign-in, the fix is one click
 *   wrong account     → explain which account would work
 *   no kitchen linked → explain that somebody at the platform has to attach it
 *
 * The third and fourth are the pair worth keeping separate. A kitchen manager whose
 * account was never linked to an outlet is not doing anything wrong, and telling them
 * "you don't have access" sends them to re-check a password that was always correct.
 */
export function Require({
  capability,
  requiresKitchen = false,
  denied,
  children,
}: {
  capability: Capability
  /**
   * Whether this surface needs the session to be attached to an outlet.
   *
   * The backend refuses every kitchen route with NO_KITCHEN_SCOPE when it is not, so
   * a page that needs it should say so rather than render a queue that can only ever
   * be empty — an empty list reads as "no orders", not as "wrong account".
   */
  requiresKitchen?: boolean
  /** Surface-specific copy for the wrong-account case; the rest the gate owns. */
  denied: { title: string; body: string }
  children: ReactNode
}) {
  const hydrated = useHydrated()
  const session = useSession()

  // Deliberately blank rather than a spinner. This lasts one frame on a normal load,
  // and a spinner that appears and vanishes that fast is just a flicker.
  if (!hydrated) return null

  if (!session.signedIn) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Please sign in"
        body="This page is tied to your account, so we need to know who you are."
        action={
          <Link href="/account">
            <Button>Sign in</Button>
          </Link>
        }
      />
    )
  }

  if (!session.capabilities.includes(capability)) {
    return <EmptyState icon={ShieldAlert} title={denied.title} body={denied.body} />
  }

  if (requiresKitchen && !session.kitchenId) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Not linked to a kitchen yet"
        body="Your account has kitchen access but is not attached to an outlet, so there is no queue to show. Ask us to link it and this page will start working."
      />
    )
  }

  return <>{children}</>
}
