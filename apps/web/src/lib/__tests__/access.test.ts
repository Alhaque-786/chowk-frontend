import { describe, expect, it } from 'vitest'

import { CAPABILITIES, Role, homeFor, sessionFor } from '../access'
import type { User } from '../api/types'

/**
 * The capability model.
 *
 * Worth testing because every mistake here is SILENT IN ONE DIRECTION. A grant that is
 * too narrow shows up as a missing link on somebody else's screen, and the person who
 * cannot see the button is rarely the person who would report it. Nothing throws; the
 * dashboard simply is not offered.
 *
 * None of this is authorization — the API gates the routes. These tests are about
 * whether the right people are SHOWN the right surfaces.
 */
function userWith(roles: string[], kitchenId?: string): User {
  return {
    id: 'u1',
    phone: '9000000000',
    full_name: 'Test',
    status: 'active',
    roles,
    phone_verified: true,
    referral_code: 'ABC',
    kitchen_id: kitchenId,
    created_at: '2026-01-01T00:00:00Z',
  }
}

describe('sessionFor', () => {
  it('grants a signed-out visitor nothing', () => {
    const s = sessionFor(null)
    expect(s.signedIn).toBe(false)
    expect(s.capabilities).toEqual([])
  })

  it('grants a customer nothing, despite being signed in', () => {
    // Customers are almost everyone, so this is the case that must not leak.
    expect(sessionFor(userWith([Role.Customer])).capabilities).toEqual([])
  })

  it('lets kitchen staff work the queue but not edit the menu', () => {
    const s = sessionFor(userWith([Role.KitchenStaff], 'k1'))
    expect(s.capabilities).toContain('kitchen.queue.view')
    expect(s.capabilities).toContain('kitchen.orders.act')
    // Someone marking dishes ready should not be able to reprice the menu.
    expect(s.capabilities).not.toContain('kitchen.catalog.manage')
  })

  it('lets a kitchen admin edit the menu', () => {
    expect(sessionFor(userWith([Role.KitchenAdmin], 'k1')).capabilities).toContain(
      'kitchen.catalog.manage',
    )
  })

  it('never gives a kitchen role the ops queue', () => {
    // The ops queue actions orders at OTHER people's vendors. A kitchen admin reaching
    // it would be a tenant boundary crossed in the UI.
    const s = sessionFor(userWith([Role.KitchenAdmin], 'k1'))
    expect(s.capabilities).not.toContain('ops.queue.view')
    expect(s.capabilities).not.toContain('ops.orders.act')
  })

  it('lets support read the ops queue but not accept on a vendor’s behalf', () => {
    // The deliberate split: accepting is a promise that food will be made, and support
    // answering "where is my juice" should not be able to make it.
    const s = sessionFor(userWith([Role.Support]))
    expect(s.capabilities).toContain('ops.queue.view')
    expect(s.capabilities).not.toContain('ops.orders.act')
  })

  it('gives a platform admin every capability, including ones added later', () => {
    // Derived rather than enumerated, mirroring Principal.HasRole in the backend. If
    // this ever needs a per-capability line, a new capability will silently exclude
    // admins until somebody remembers to add it.
    expect([...sessionFor(userWith([Role.PlatformAdmin])).capabilities].sort()).toEqual(
      [...CAPABILITIES].sort(),
    )
  })

  it('drops a role it has never heard of', () => {
    // The API can ship a role before this app knows about it. Being out of date must
    // cost a missing link, never an accidental capability.
    const s = sessionFor(userWith(['franchisee', Role.Customer]))
    expect(s.roles).toEqual([Role.Customer])
    expect(s.capabilities).toEqual([])
  })

  it('does not invent a kitchen for staff who are not linked to one', () => {
    // The backend refuses these routes with NO_KITCHEN_SCOPE; the gate needs to tell
    // them apart from "no orders".
    expect(sessionFor(userWith([Role.KitchenStaff])).kitchenId).toBeNull()
  })

  it('does not duplicate a capability held twice over', () => {
    const s = sessionFor(userWith([Role.KitchenStaff, Role.KitchenAdmin], 'k1'))
    expect(new Set(s.capabilities).size).toBe(s.capabilities.length)
  })
})

describe('homeFor', () => {
  it('sends a customer to the shop', () => {
    expect(homeFor(sessionFor(userWith([Role.Customer])))).toBe('/')
  })

  it('sends kitchen staff to their queue', () => {
    expect(homeFor(sessionFor(userWith([Role.KitchenStaff], 'k1')))).toBe('/kitchen')
  })

  it('sends a platform admin to ops rather than to a kitchen', () => {
    // An admin holds both capabilities; the queue they actually work is ops.
    expect(homeFor(sessionFor(userWith([Role.PlatformAdmin])))).toBe('/admin/ops')
  })
})
