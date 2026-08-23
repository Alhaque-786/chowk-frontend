import { api, type CallOptions } from '@/lib/api/client'
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
  /**
   * Every saved address. Requires auth.
   *
   * Takes CallOptions so a caller can pass `signal` and abort on unmount, or
   * shorten `timeoutMs`. The transport has supported both all along; not
   * forwarding them here meant a component could not use either — a service that
   * hides its transport's capabilities is a service you end up working around.
   */
  list: async (options?: CallOptions): Promise<Address[]> => {
    const result = await api.get<{ addresses: Address[] }>('/addresses', options)
    return result.addresses ?? []
  },

  /**
   * The default address, or null.
   *
   * Falls back to the first address when none is flagged default — a customer
   * with exactly one saved address has clearly told us where they are, whether or
   * not a flag got set.
   */
  getDefault: async (options?: CallOptions): Promise<Address | null> => {
    const addresses = await AddressService.list(options)
    return addresses.find((a) => a.is_default) ?? addresses[0] ?? null
  },

  create: async (address: Omit<Address, 'id'>): Promise<Address> =>
    api.post<Address>('/addresses', address),

  update: async (addressId: string, patch: Partial<Address>): Promise<Address> =>
    api.patch<Address>(`/addresses/${addressId}`, patch),

  remove: async (addressId: string): Promise<void> => {
    await api.delete(`/addresses/${addressId}`)
  },
}

export default AddressService
