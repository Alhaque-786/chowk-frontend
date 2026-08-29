import { api, type CallOptions } from '@/lib/api/client'

export type LivePosition = {
  latitude: number
  longitude: number
  /** ISO timestamp of when the rider's device took the reading. */
  recorded_at: string
}

/**
 * Where the rider is, right now.
 *
 * A SEPARATE POLL from the delivery record, because the two change at completely
 * different rates. The rider's name and phone are fixed for the whole delivery;
 * his position changes every few seconds. Folding them together would mean either
 * re-fetching static fields constantly or refreshing the map too slowly.
 *
 * Returns null for every ordinary "nothing to draw" case. The API answers 204 for
 * all of them — no rider assigned, nothing reported yet, the position gone stale,
 * or the order already delivered — precisely so the client does not have to tell
 * an empty answer from a broken request.
 */
const TrackingService = {
  position: async (orderId: string, options?: CallOptions): Promise<LivePosition | null> => {
    const res = await api.get<LivePosition | null>(
      `/deliveries/by-order/${orderId}/location`,
      {
        // Short: this is a dot on a map that will be asked for again in ten
        // seconds. A slow answer is worth abandoning, not waiting for.
        timeoutMs: 5_000,
        ...options,
      },
    )
    return res ?? null
  },
}

export default TrackingService
