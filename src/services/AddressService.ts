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

  /**
   * Removes an address from the customer's list.
   *
   * SOFT on the server: the row is deactivated, never deleted, because orders
   * carry `delivery_address_id` and past deliveries should stay explainable. The
   * name stays `remove` rather than `deactivate` because that is what it means to
   * the person tapping it — the API's storage decision is not the caller's
   * concern, and every read already excludes removed addresses.
   *
   * Not retried automatically: a DELETE is idempotent so a retry is safe, but a
   * customer who taps remove wants to know immediately if it did not work rather
   * than waiting through three attempts.
   */
  remove: async (addressId: string, options?: CallOptions): Promise<void> => {
    await api.delete(`/addresses/${addressId}`, { retry: false, ...options })
  },
}

export default AddressService
