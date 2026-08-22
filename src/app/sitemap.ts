import type { MetadataRoute } from 'next'
import { request } from '@/lib/api/client'
import { SITE_URL } from '@/lib/seo'
import type { NearbyKitchen } from '@/lib/api/types'

/**
 * The sitemap is generated from live data, so a newly onboarded kitchen becomes
 * crawlable without anyone editing a file.
 *
 * Revalidated hourly rather than per-request: search engines fetch this rarely,
 * and querying every kitchen on each crawler hit would be a slow endpoint that
 * only bots use.
 */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/kitchens`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  // Kitchen pages are the pages that actually rank — they carry the menu and the
  // structured data. A failure here must degrade to the static routes rather
  // than break the sitemap entirely, because an erroring sitemap gets dropped.
  try {
    // Lucknow city centre as the seed for a broad radius sweep. This is a
    // deliberate placeholder: it should become a proper "all active kitchens"
    // endpoint rather than a geo query, since a sitemap wants everything and not
    // what is near a point.
    const result = await request<{ kitchens: NearbyKitchen[] }>(
      '/kitchens/nearby?lat=26.85&lng=80.947&radius_m=50000&limit=100',
      { auth: false, revalidate: 3600 },
    )

    const kitchenRoutes: MetadataRoute.Sitemap = (result.kitchens ?? []).map(
      (kitchen) => ({
        url: `${SITE_URL}/kitchens/${kitchen.id}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        // Open kitchens rank above closed ones: a customer arriving from search
        // at a closed kitchen is a wasted click.
        priority: kitchen.is_open ? 0.8 : 0.5,
      }),
    )

    return [...staticRoutes, ...kitchenRoutes]
  } catch {
    return staticRoutes
  }
}
