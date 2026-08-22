import { notFound } from 'next/navigation'
import { KitchenHeader } from '@/components/menu/kitchen-header'
import { MenuItemCard } from '@/components/menu/menu-item-card'
import { ApiError, request } from '@/lib/api/client'
import type { Menu } from '@/lib/api/types'
import type { Metadata } from 'next'

/**
 * NOTE on this Next.js version: `params` is a PROMISE and must be awaited.
 * Reading it synchronously is the single most common breaking change from older
 * App Router code, and it fails at runtime rather than at build.
 */
type PageProps = { params: Promise<{ kitchenId: string }> }

async function getMenu(kitchenId: string): Promise<Menu | null> {
  try {
    return await request<Menu>(`/kitchens/${kitchenId}/menu`, {
      // Public read: no bearer token, and sending one would be pointless.
      auth: false,
      // `fetch` is NOT cached by default in this version, so caching is opt-in.
      // 60s is a deliberate compromise: the menu is the hottest read in the
      // system and changes rarely, but a price change must not take minutes to
      // appear. The backend also invalidates its own cache on write.
      revalidate: 60,
    })
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    // Anything else is a real failure. Rethrowing lets error.tsx handle it
    // rather than rendering an empty menu as though the kitchen had no food.
    throw err
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kitchenId } = await params
  const menu = await getMenu(kitchenId)
  if (!menu) return { title: 'Kitchen not found' }

  return {
    title: menu.kitchen.name,
    description:
      menu.kitchen.description ||
      `Order from ${menu.kitchen.name}${
        menu.kitchen.cuisines.length ? ` — ${menu.kitchen.cuisines.join(', ')}` : ''
      }.`,
  }
}

export default async function KitchenMenuPage({ params }: PageProps) {
  const { kitchenId } = await params
  const menu = await getMenu(kitchenId)

  if (!menu) notFound()

  const categories = menu.categories.filter((c) => c.items.length > 0)
  const itemCount = categories.reduce((n, c) => n + c.items.length, 0)

  return (
    <main className="pb-24">
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
    </main>
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
