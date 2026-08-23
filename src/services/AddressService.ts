import { request } from '@/lib/api/client'
import type { Address } from '@/lib/api/types'

/**
 * Saved delivery addresses — part of the `identity` backend module, split into
 * its own service because it is a distinct concern with its own route subtree
 * (`/addresses`) and a completely different set of callers to auth.
 *
 * This is also where the home page's delivery point comes from once someone is
 * signed in: their default address beats geolocation, because a saved address
 * has a door number and a landmark, and coordinates do not.
 */
const AddressService = {
  /** Every saved address. Requires auth. */
  list: async (): Promise<Address[]> => {
    const result = await request<{ addresses: Address[] }>('/addresses')
    return result.addresses ?? []
  },

  /**
   * The default address, or null.
   *
   * Falls back to the first address when none is flagged default — a customer
   * with exactly one saved address has clearly told us where they are, whether or
   * not a flag got set.
   */
  getDefault: async (): Promise<Address | null> => {
    const addresses = await AddressService.list()
    return addresses.find((a) => a.is_default) ?? addresses[0] ?? null
  },

  create: async (address: Omit<Address, 'id'>): Promise<Address> =>
    request<Address>('/addresses', { method: 'POST', body: address }),

  update: async (addressId: string, patch: Partial<Address>): Promise<Address> =>
    request<Address>(`/addresses/${addressId}`, { method: 'PATCH', body: patch }),

  remove: async (addressId: string): Promise<void> => {
    await request<unknown>(`/addresses/${addressId}`, { method: 'DELETE' })
  },
}

export default AddressService
