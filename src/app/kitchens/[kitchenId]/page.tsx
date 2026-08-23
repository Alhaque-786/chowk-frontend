import { notFound } from 'next/navigation'
import { KitchenHeader } from '@/components/menu/kitchen-header'
import { MenuItemCard } from '@/components/menu/menu-item-card'
import CatalogService from '@/services/CatalogService'
import {
  breadcrumbJsonLd,
  jsonLdScript,
  restaurantJsonLd,
} from '@/lib/seo'
import type { Metadata } from 'next'

/**
 * NOTE on this Next.js version: `params` is a PROMISE and must be awaited.
 * Reading it synchronously is the single most common breaking change from older
 * App Router code, and it fails at runtime rather than at build.
 */
type PageProps = { params: Promise<{ kitchenId: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kitchenId } = await params
  const menu = await CatalogService.getMenu(kitchenId)
  if (!menu) return { title: 'Kitchen not found' }

  const cuisines = menu.kitchen.cuisines.join(', ')
  const description =
    menu.kitchen.description ||
    `Order ${cuisines || 'food'} from ${menu.kitchen.name} in ${menu.kitchen.city}. ` +
      `See the full menu with prices and order for delivery.`

  return {
    title: menu.kitchen.name,
    description,
    // Canonical per kitchen, so a menu reached via a filter or a tracking
    // parameter does not split its ranking across duplicate URLs.
    alternates: { canonical: `/kitchens/${kitchenId}` },
    openGraph: {
      title: `${menu.kitchen.name} — menu and prices`,
      description,
      url: `/kitchens/${kitchenId}`,
      type: 'website',
    },
  }
}

export default async function KitchenMenuPage({ params }: PageProps) {
  const { kitchenId } = await params
  const menu = await CatalogService.getMenu(kitchenId)

  if (!menu) notFound()

  const categories = menu.categories.filter((c) => c.items.length > 0)
  const itemCount = categories.reduce((n, c) => n + c.items.length, 0)

  return (
    <div className="pb-24">
      {/*
        Restaurant + Menu structured data. This is the highest-leverage SEO on
        the whole site: Google renders rich results for these types, so ratings,
        price range and individual dishes can appear directly in search. None of
        it is inferred from the page text.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(restaurantJsonLd(menu.kitchen, menu))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbJsonLd([
            { name: 'Chowk', path: '/' },
            { name: 'Kitchens', path: '/kitchens' },
            { name: menu.kitchen.name, path: `/kitchens/${kitchenId}` },
          ]),
        )}
      />

      <KitchenHeader kitchen={menu.kitchen} />

      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        {itemCount === 0 ? (
          <EmptyMenu />
        ) : (
          categories.map((category) => (
            <section key={category.id} className="pt-7">
              <h2 className="font-display text-lg font-semibold text-ink">
                {category.name}
                <span className="ml-2 text-sm font-normal text-ink-faint tabular">
                  {category.items.length}
                </span>
              </h2>
              {category.description && (
                <p className="mt-1 text-sm text-ink-soft">{category.description}</p>
              )}

              <div className="mt-2">
                {category.items.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * An empty menu is a real state, not an error: every dish can be sold out at
 * once. It says so plainly rather than rendering a blank page that reads as
 * broken.
 */
function EmptyMenu() {
  return (
    <div className="py-16 text-center">
      <p className="font-display text-lg font-semibold text-ink">
        Nothing available right now
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
        Everything on this menu is sold out or off for the moment. Worth checking
        back a little later.
      </p>
    </div>
  )
}
