import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/**
 * robots.txt, generated so the sitemap URL cannot drift from SITE_URL.
 *
 * The disallow list is the important part. Crawling a cart or checkout wastes
 * budget on pages that are per-user and uncacheable, and indexing them would put
 * someone else's order confirmation in search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/cart',
          '/checkout',
          '/orders/', // per-user; never indexable
          '/account',
          '/kitchen/', // staff dashboard
          '/admin/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
