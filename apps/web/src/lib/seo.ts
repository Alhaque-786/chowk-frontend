import type { Kitchen, Menu, MenuItem } from './api/types'

/**
 * Structured data (JSON-LD) for search engines.
 *
 * This is the highest-leverage SEO work for a food business specifically. Google
 * renders rich results for Restaurant and Menu types — ratings, price range,
 * opening hours and individual dishes can appear directly in search — and none of
 * it is inferred from the page text. Without JSON-LD you compete as a generic web
 * page; with it you compete as a restaurant.
 *
 * Every builder returns a plain object, injected via a <script type="application/
 * ld+json"> tag. Values come from the API, never hardcoded, so the markup cannot
 * claim a rating the kitchen does not have — which is the kind of mismatch that
 * gets structured data ignored or penalised.
 */

export const SITE_NAME = 'Chowk'
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chowk.in'

/** JSON-LD is untyped by nature; this keeps call sites honest without fighting it. */
type JsonLd = Record<string, unknown>

/**
 * Organization + WebSite for the home page.
 *
 * The SearchAction is what can produce a sitelinks search box in Google results,
 * letting someone search the site from the SERP.
 */
export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        description:
          'Order food from kitchens near you. Lower commission for restaurants, lower prices for you.',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }
}

/**
 * Restaurant markup for a kitchen page.
 *
 * `aggregateRating` is omitted entirely when there are no reviews. Emitting a
 * rating of 0 out of 0 is worse than emitting nothing: Google treats invalid
 * structured data as a reason to distrust all of it on the page.
 */
export function restaurantJsonLd(kitchen: Kitchen, menu?: Menu): JsonLd {
  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${SITE_URL}/kitchens/${kitchen.id}#restaurant`,
    name: kitchen.name,
    url: `${SITE_URL}/kitchens/${kitchen.id}`,
    ...(kitchen.description ? { description: kitchen.description } : {}),
    ...(kitchen.cuisines.length ? { servesCuisine: kitchen.cuisines } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: kitchen.city,
      addressCountry: 'IN',
    },
    // A delivery-only kitchen genuinely has no dining area, and saying so
    // prevents Google surfacing it for "restaurants near me to sit in".
    servesCuisine: kitchen.cuisines,
    hasDeliveryService: true,
    acceptsReservations: false,
  }

  if (kitchen.rating_count > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: kitchen.rating_average.toFixed(1),
      reviewCount: kitchen.rating_count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  if (menu) {
    const priced = menu.categories.flatMap((c) => c.items.map((i) => i.price_minor))
    if (priced.length > 0) {
      // priceRange is a free-text hint Google displays; a real min-max is more
      // useful than the conventional "₹₹" guess.
      const min = Math.min(...priced)
      const max = Math.max(...priced)
      data.priceRange = `₹${Math.round(min / 100)}–₹${Math.round(max / 100)}`
    }
    data.hasMenu = menuJsonLd(kitchen, menu)
  }

  return data
}

/** Menu → MenuSection → MenuItem, which is what produces dish-level results. */
export function menuJsonLd(kitchen: Kitchen, menu: Menu): JsonLd {
  return {
    '@type': 'Menu',
    '@id': `${SITE_URL}/kitchens/${kitchen.id}#menu`,
    name: `${kitchen.name} menu`,
    hasMenuSection: menu.categories
      .filter((c) => c.items.length > 0)
      .map((category) => ({
        '@type': 'MenuSection',
        name: category.name,
        ...(category.description ? { description: category.description } : {}),
        hasMenuItem: category.items.map(menuItemJsonLd),
      })),
  }
}

export function menuItemJsonLd(item: MenuItem): JsonLd {
  const data: JsonLd = {
    '@type': 'MenuItem',
    name: item.name,
    ...(item.description ? { description: item.description } : {}),
    offers: {
      '@type': 'Offer',
      // schema.org wants a decimal string in major units, so the paise integer
      // is converted here and nowhere else.
      price: (item.price_minor / 100).toFixed(2),
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
    },
  }

  // suitableForDiet is the standard vocabulary, and it maps cleanly onto the
  // veg/non-veg distinction Indian customers filter by first.
  if (item.food_type === 'veg') {
    data.suitableForDiet = 'https://schema.org/VegetarianDiet'
  } else if (item.food_type === 'vegan') {
    data.suitableForDiet = 'https://schema.org/VeganDiet'
  }

  if (item.allergens.length > 0) {
    // Surfaced as structured data because allergen information is
    // safety-critical, not marketing.
    data.nutrition = { '@type': 'NutritionInformation' }
    data.description = [data.description, `Contains ${item.allergens.join(', ')}.`]
      .filter(Boolean)
      .join(' ')
  }

  return data
}

/**
 * Breadcrumbs.
 *
 * Google replaces the URL in results with this trail, so a menu page reads
 * "Chowk › Kitchens › Khansama" rather than a bare path. Cheap, and it measurably
 * improves click-through.
 */
export function breadcrumbJsonLd(
  trail: Array<{ name: string; path: string }>,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  }
}

/**
 * Renders JSON-LD into a script tag.
 *
 * JSON.stringify escapes the content, and the `<` replacement closes the one
 * remaining hole: a dish literally named "</script>" would otherwise break out
 * of the tag. Menu names come from merchant input, so that is untrusted text.
 */
export function jsonLdScript(data: JsonLd): { __html: string } {
  return {
    __html: JSON.stringify(data).replace(/</g, '\\u003c'),
  }
}
