import { notFound } from 'next/navigation'
import { KitchenHeader } from '@/components/menu/kitchen-header'
import { MenuItemCard } from '@/components/menu/menu-item-card'
import { AddToCart } from '@/components/menu/add-to-cart'
import { MenuBrowser } from '@/components/menu/menu-browser'
import { CategoryRail } from '@/components/menu/category-rail'
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
type PageProps = {
  params: Promise<{ kitchenId: string }>
  /** Also a Promise in this version. `?veg=1` filters the menu ON THE SERVER. */
  searchParams: Promise<{ veg?: string }>
}

export async function generateMetadata({ params }: Pick<PageProps, 'params'>): Promise<Metadata> {
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

export default async function KitchenMenuPage({ params, searchParams }: PageProps) {
  const { kitchenId } = await params
  const { veg } = await searchParams
  const menu = await CatalogService.getMenu(kitchenId)

  if (!menu) notFound()

  const vegOnly = veg === '1'

  const allCategories = menu.categories.filter((c) => c.items.length > 0)
  const totalCount = allCategories.reduce((n, c) => n + c.items.length, 0)
  const vegCount = allCategories.reduce(
    (n, c) => n + c.items.filter((i) => i.food_type === 'veg').length,
    0,
  )

  /*
    Filtered HERE, on the server, not hidden with CSS in the browser.

    Three things follow from that: the filtered menu is real HTML so it stays
    indexable, `?veg=1` is a shareable link — genuinely useful to send someone —
    and the filter works with JavaScript disabled, because the control is a link.

    Empty categories are dropped after filtering. A "Kebabs 0" heading over
    nothing reads as a loading failure.
  */
  const categories = (
    vegOnly
      ? allCategories
          .map((c) => ({ ...c, items: c.items.filter((i) => i.food_type === 'veg') }))
          .filter((c) => c.items.length > 0)
      : allCategories
  )
  const itemCount = categories.reduce((n, c) => n + c.items.length, 0)

  /** Flat list for client-side search. Carries its category name so a search for
   *  "kebab" finds the whole section, not only dishes with it in the title. */
  const flatItems = categories.flatMap((c) =>
    c.items.map((item) => ({ ...item, categoryName: c.name })),
  )

  const railCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    count: c.items.length,
  }))

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
        {totalCount === 0 ? (
          <EmptyMenu />
        ) : (
          <MenuBrowser
            kitchenId={kitchenId}
            categories={railCategories}
            items={flatItems}
            vegOnly={vegOnly}
            vegCount={vegCount}
            totalCount={totalCount}
            kitchenOpen={menu.kitchen.is_open}
          >
          {itemCount === 0 ? (
            <NoVegMatches />
          ) : (
          <div className="flex gap-10 lg:gap-14">
            {/*
              The same scroll-spy component in its vertical form. It used to be a
              hand-rolled copy of the rail's markup, which meant the highlight
              logic existed twice and only one of them had it.
            */}
            <div className="hidden w-48 shrink-0 lg:block">
              <div className="sticky top-[7.5rem] pt-8">
                <CategoryRail categories={railCategories} variant="list" />
              </div>
            </div>

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
          </MenuBrowser>
        )}
      </div>
    </div>
  )
}

/**
 * The veg filter matched nothing in a menu that does have dishes.
 *
 * A distinct state from an empty menu, and worth distinguishing: "this kitchen
 * has no food" and "this kitchen has no vegetarian food" call for different next
 * actions, and showing the first when the second is true reads as broken.
 */
function NoVegMatches() {
  return (
    <div className="py-16 text-center">
      <p className="font-display text-lg font-bold text-ink">
        Nothing vegetarian right now
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        Everything vegetarian on this menu is sold out or off for the moment. Turn
        off the filter to see the rest.
      </p>
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
