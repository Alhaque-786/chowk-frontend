'use client'

import Link from 'next/link'
import { homeFor, useSession } from '@/lib/access'

/**
 * A link to whichever dashboard this person actually works in.
 *
 * Absent for customers, who are almost everyone. Present for kitchen staff and
 * platform staff, because without it a kitchen manager has to know to type /kitchen
 * — and the alternative was a merchant on this platform having no route to their own
 * order queue at all.
 *
 * useSession subscribes rather than reading once, so the link appears the instant
 * somebody signs in. Roles live in localStorage and change on sign-in and sign-out,
 * and mirroring them into state would mean a stale render right after login — the
 * moment the link most needs to appear.
 *
 * A REMINDER, because this file is where somebody will look for the access rule:
 * hiding a link is not access control. The backend gates these routes; this only
 * decides whether to offer the journey.
 */
export function StaffLink() {
  const session = useSession()

  // Ops before kitchen: a platform admin holds both capabilities, and the queue they
  // actually work is the ops one.
  const label = session.capabilities.includes('ops.queue.view')
    ? 'Ops'
    : session.capabilities.includes('kitchen.queue.view')
      ? 'Kitchen'
      : null

  if (!label) return null

  return (
    <Link
      href={homeFor(session)}
      className="hidden rounded-lg bg-brand-soft px-2.5 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft/70 sm:inline-flex"
    >
      {label}
    </Link>
  )
}
