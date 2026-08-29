'use client'

import { useSyncExternalStore } from 'react'
import { onSessionChange, tokens } from '@/lib/api/tokens'
import type { User } from '@/lib/api/types'

/**
 * What the signed-in person may SEE. Not what they may do.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTHING HERE IS SECURITY, and the design is shaped around making that hard to
 * forget. Everything derives from a User cached in localStorage, which anybody can
 * edit in devtools in about four seconds. This module decides which links to offer
 * and which explanation to render — nothing else.
 *
 * Authorization lives in the API, on 46 gated routes, and that is the only place it
 * can live. A hidden button is a hidden button; the endpoint behind it has to
 * refuse on its own.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THIS IS THE ONLY PLACE THE WEB APP NAMES A ROLE. Not because one file is tidier,
 * but because a second copy is a second thing to update: the first time a role is
 * renamed, the copy nobody remembered becomes a gate that silently never opens.
 * Components below import capabilities from here and never write the strings.
 *
 * CAPABILITIES AT CALL SITES, NOT ROLES. A component asks "may this person see the
 * kitchen queue", never "is this person a kitchen_admin". The difference shows up
 * the first time a role is added or split: with capabilities that is one edit to the
 * map below, and with role checks it is a hunt through every component that happened
 * to name the old role. It also reads better — `can('kitchen.queue.view')` says what
 * the code is for, where `isKitchenAdmin()` says who happens to qualify today.
 */

/**
 * The roles, exactly as the API sends them.
 *
 * Mirrors httpx.Role in the backend, and `make check-roles` fails the build if the
 * two lists stop matching. A mirror rather than a shared package because these
 * strings are a wire contract crossing a language boundary — Go cannot import a
 * TypeScript const, so the honest options are a checked copy or an unchecked one.
 */
export const Role = {
  Customer: 'customer',
  KitchenStaff: 'kitchen_staff',
  KitchenAdmin: 'kitchen_admin',
  Rider: 'rider',
  Support: 'support',
  PlatformAdmin: 'platform_admin',
} as const

export type RoleName = (typeof Role)[keyof typeof Role]

/**
 * Every surface in this app that can be gated.
 *
 * Named after the SCREEN, not the endpoint, because that is what a component knows
 * about. Deliberately few: a capability per button is a permission system nobody
 * maintains, and this list should only grow when a new surface appears.
 */
export const CAPABILITIES = [
  /** The merchant's own order queue. */
  'kitchen.queue.view',
  /** Accept, start, ready, hand over, reject — on one's own kitchen. */
  'kitchen.orders.act',
  /** Menu, hours and pricing for one's own kitchen. */
  'kitchen.catalog.manage',
  /** The platform's queue for vendors who cannot action their own orders. */
  'ops.queue.view',
  /** Acting on any order, on a vendor's behalf. */
  'ops.orders.act',
  /** Coupons, event handlers, the platform's own settings. */
  'platform.admin',
] as const

export type Capability = (typeof CAPABILITIES)[number]

/**
 * Which roles grant what.
 *
 * MIRRORS THE BACKEND'S ROUTE GROUPS on purpose. The kitchen routes are mounted
 * behind kitchen_staff and kitchen_admin; ops and admin routes behind platform_admin.
 * If this map disagrees with those mounts the UI either offers a journey the API
 * refuses, or hides one it would allow — and the second is worse, because nobody
 * reports a button they never saw.
 *
 * platform_admin is ABSENT here and handled in sessionFor() instead. The backend's
 * Principal.HasRole treats it as an implicit superuser, so enumerating its
 * capabilities would mean every future capability silently excludes admins until
 * somebody remembers this line.
 */
const GRANTS: Record<Exclude<RoleName, typeof Role.PlatformAdmin>, readonly Capability[]> = {
  [Role.Customer]: [],
  [Role.KitchenStaff]: ['kitchen.queue.view', 'kitchen.orders.act'],
  [Role.KitchenAdmin]: ['kitchen.queue.view', 'kitchen.orders.act', 'kitchen.catalog.manage'],
  [Role.Rider]: [],
  // Support reads orders and issues refunds, and needs the ops queue to answer
  // "where is my juice" — but not to accept on a vendor's behalf, which is a
  // promise that the food will actually be made.
  [Role.Support]: ['ops.queue.view'],
}

/** The session, as this app understands it. */
export type Session = {
  user: User | null
  roles: readonly RoleName[]
  capabilities: readonly Capability[]
  /** The outlet this person works at. Absent for customers and platform staff. */
  kitchenId: string | null
  signedIn: boolean
}

const ANONYMOUS: Session = {
  user: null,
  roles: [],
  capabilities: [],
  kitchenId: null,
  signedIn: false,
}

/**
 * The session a given user implies. Pure, and exported so the capability model can be
 * tested without rendering anything — the alternative is a jsdom render to assert a
 * lookup table, which is slower and tests React rather than the rule.
 */
export function sessionFor(user: User | null): Session {
  if (!user) return ANONYMOUS

  const roles = (user.roles ?? []).filter(isKnownRole)
  const capabilities = roles.includes(Role.PlatformAdmin)
    ? CAPABILITIES
    : [...new Set(roles.flatMap((r) => GRANTS[r as keyof typeof GRANTS] ?? []))]

  return {
    user,
    roles,
    capabilities,
    kitchenId: user.kitchen_id ?? null,
    signedIn: true,
  }
}

/**
 * Unknown roles are DROPPED rather than carried.
 *
 * The API can add a role before this app has heard of it, and an unrecognised string
 * grants nothing here — so the failure mode of being out of date is a missing link,
 * never an accidental capability.
 */
function isKnownRole(role: string): role is RoleName {
  return (Object.values(Role) as string[]).includes(role)
}

/*
  ── The snapshot cache ──────────────────────────────────────────────────────
  useSyncExternalStore compares snapshots by reference and re-renders whenever they
  differ, so returning a freshly built object on every call is an infinite render
  loop. The session is rebuilt only when the stored user actually changes, and the
  same object is handed back until then.
*/
let cachedRaw: string | null = null
let cached: Session = ANONYMOUS

function snapshot(): Session {
  const user = tokens.user()
  const raw = user ? JSON.stringify(user) : null
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cached = sessionFor(user)
  }
  return cached
}

/**
 * Anonymous on the server, always.
 *
 * Next server-renders client components too, and localStorage does not exist there.
 * Returning anything else makes server and client disagree on the first paint, which
 * React reports as a hydration mismatch and a reader experiences as the page changing
 * underneath them.
 *
 * The consequence is deliberate and worth stating plainly: a gated screen renders its
 * signed-out state for one frame, then resolves. That is correct — the server
 * genuinely does not know who is asking.
 */
function serverSnapshot(): Session {
  return ANONYMOUS
}

/**
 * The current session, reactively.
 *
 * Re-renders on sign-in, on sign-out, and on a sign-out in ANOTHER TAB, because
 * tokens.ts listens for `storage` as well as its own event. Without this the kitchen
 * dashboard's gate showed "not a kitchen account" until a full navigation: it read
 * localStorage during render, and nothing ever told it to look again.
 */
export function useSession(): Session {
  return useSyncExternalStore(onSessionChange, snapshot, serverSnapshot)
}

/** Whether this person may see something, reactively. */
export function useCan(capability: Capability): boolean {
  return useSession().capabilities.includes(capability)
}

/**
 * The non-reactive form, for code that is not a component.
 *
 * Event handlers and service callers may use this. A component must not: it will not
 * re-render when the session changes, which is the exact bug this module was
 * rewritten to remove.
 */
export function can(capability: Capability): boolean {
  return snapshot().capabilities.includes(capability)
}

/**
 * Where this person's work lives.
 *
 * Sends somebody to the surface they operate rather than making a kitchen manager
 * navigate the customer site to find their order queue. Customers get the home page,
 * because they are almost everyone.
 */
export function homeFor(session: Session): string {
  if (session.capabilities.includes('ops.queue.view')) return '/admin/ops'
  if (session.capabilities.includes('kitchen.queue.view')) return '/kitchen'
  return '/'
}
