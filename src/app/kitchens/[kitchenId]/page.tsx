import { notFound } from 'next/navigation'
import { KitchenHeader } from '@/components/menu/kitchen-header'
import { MenuItemCard } from '@/components/menu/menu-item-card'
import { AddToCart } from '@/components/menu/add-to-cart'
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

      {/*
        Two columns from lg up: a sticky category index on the left, the menu on
        the right. The page was a single max-w-2xl column centred in a 1440px
        viewport, which left two thirds of the screen empty and gave a fifty-item
        menu no navigation at all -- you scrolled and hoped.

        The index is what both references do, and it earns its place rather than
        filling space: it tells you what a kitchen serves before you scroll, and
        it is the only way to reach "Desserts" on a long menu without dragging.
        Anchor links, so it works with JavaScript disabled and the browser owns
        the scrolling.
      */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {itemCount === 0 ? (
          <EmptyMenu />
        ) : (
          <div className="flex gap-10 lg:gap-14">
            <nav
              aria-label="Menu categories"
              className="hidden w-48 shrink-0 lg:block"
            >
              {/* Sticky below the site header. `top` clears it so the index does
                  not slide under the logo. */}
              <div className="sticky top-6 pt-8">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  On the menu
                </p>
                <ul className="flex flex-col gap-0.5">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <a
                        href={`#cat-${category.id}`}
                        className="flex items-baseline justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink-soft transition-colors hover:bg-surface-sunk hover:text-ink"
                      >
                        <span className="truncate">{category.name}</span>
                        <span className="tabular shrink-0 text-xs text-ink-faint">
                          {category.items.length}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            <div className="min-w-0 flex-1">
              {categories.map((category) => (
                <section
                  key={category.id}
                  id={`cat-${category.id}`}
                  // scroll-mt so an anchor jump does not tuck the heading under
                  // the sticky site header.
                  className="scroll-mt-6 pt-8"
                >
                  <h2 className="font-display text-xl font-bold text-ink">
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
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        action={
                          <AddToCart
                            kitchenId={kitchenId}
                            item={item}
                            // A closed kitchen disables every add rather than
                            // failing at checkout. The reason is the kitchen's,
                            // not the dish's, so it is stated once here.
                            disabled={!menu.kitchen.is_open}
                            disabledReason="Closed"
                          />
                        }
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
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
