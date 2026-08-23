'use client'

import { useMemo, useState } from 'react'
import { SearchX } from 'lucide-react'
import { MenuToolbar } from './menu-toolbar'
import { CategoryRail } from './category-rail'
import { MenuItemCard } from './menu-item-card'
import { AddToCart } from './add-to-cart'
import type { MenuItem } from '@/lib/api/types'

/**
 * Wraps the menu with its controls, and swaps in search results when asked.
 *
 * THE SHAPE HERE IS THE POINT. The menu sections arrive as `children`, already
 * rendered on the server. This component never re-renders them — it shows them,
 * or it hides them and shows its own filtered list instead.
 *
 * That buys both halves of something usually traded away:
 *
 *   - With no query, the visible menu is SERVER HTML. Indexable, present without
 *     JavaScript, and the largest paint does not wait on hydration. For a
 *     marketplace the menu is the most valuable content on the site, so making it
 *     client-rendered to get a search box would be a bad trade.
 *   - With a query, filtering happens in the browser over items already in the
 *     page. Instant, no round trip per keystroke.
 *
 * The cost is that items are serialised twice — once as rendered HTML, once as
 * the `items` array. Worth it, and smaller than it sounds: the page already
 * serialises the full menu for its JSON-LD.
 *
 * `hidden` rather than unmounting the children, so returning from a search does
 * not re-run image loading and lose scroll position.
 */
export function MenuBrowser({
  kitchenId,
  categories,
  items,
  vegOnly,
  vegCount,
  totalCount,
  kitchenOpen,
  children,
}: {
  kitchenId: string
  categories: Array<{ id: string; name: string; count: number }>
  /** Flat list, for client-side search only. */
  items: Array<MenuItem & { categoryName: string }>
  vegOnly: boolean
  vegCount: number
  totalCount: number
  kitchenOpen: boolean
  children: React.ReactNode
}) {
  const [query, setQuery] = useState('')
  const searching = query.trim() !== ''

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q === '') return []
    // Name, description and category, in that order of usefulness. Substring
    // rather than fuzzy: a kitchen menu is tens of items, and a near-miss showing
    // the wrong dish is worse than no match on a page where you can also just
    // scroll.
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q),
    )
  }, [items, query])

  return (
    <div>
      {/*
        Sticky, and `top-0 z-20` with a blurred translucent ground so the menu
        scrolls under it rather than being covered by an opaque slab. The controls
        are the thing you reach for repeatedly on a long menu, so they should never
        be somewhere you have to scroll back to.
      */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-rule bg-ground/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <MenuToolbar
          vegOnly={vegOnly}
          vegCount={vegCount}
          totalCount={totalCount}
          onQueryChange={setQuery}
        />
        {/*
          The rail is meaningless while searching — results are not grouped.

          Hidden at lg and up because the sidebar index takes over there. Showing
          both was pure duplication: the same four categories twice, one above the
          other, competing for the same tap.
        */}
        {!searching && (
          <div className="mt-3 lg:hidden">
            <CategoryRail categories={categories} />
          </div>
        )}
      </div>

      {searching ? (
        <div className="pt-6">
          <p className="text-sm text-ink-soft" role="status" aria-live="polite">
            {results.length === 0
              ? `Nothing matching “${query.trim()}”`
              : `${results.length} ${results.length === 1 ? 'dish' : 'dishes'} matching “${query.trim()}”`}
          </p>

          {results.length === 0 ? (
            <div className="mt-8 flex flex-col items-center gap-2 text-center">
              <SearchX className="size-7 text-ink-faint" aria-hidden="true" />
              <p className="font-display text-base font-bold text-ink">
                Not on this menu
              </p>
              <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
                Clear the search to see everything, or try a shorter word — this
                matches on spelling, so a near miss finds nothing.
              </p>
            </div>
          ) : (
            <div className="mt-2">
              {results.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  action={
                    <AddToCart
                      kitchenId={kitchenId}
                      item={item}
                      disabled={!kitchenOpen}
                      disabledReason="Closed"
                    />
                  }
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/*
        Kept mounted and hidden while searching. `hidden` also removes it from the
        accessibility tree, so a screen reader is not offered two menus at once.
      */}
      <div hidden={searching}>{children}</div>
    </div>
  )
}
