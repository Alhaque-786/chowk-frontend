'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * The menu's controls: filter to vegetarian, and search within this kitchen.
 *
 * The two work DIFFERENTLY on purpose, and the split is the interesting decision.
 *
 * VEG lives in the URL (`?veg=1`) and is applied on the SERVER. That costs a
 * navigation, and buys three things worth more: the filtered menu is
 * server-rendered so it stays indexable, the filter works with JavaScript
 * disabled because it is a link, and "pure veg menu" becomes a shareable URL —
 * which for an Indian food app is a genuinely useful thing to send to someone.
 *
 * SEARCH is client-side over the menu already in the page. A round trip per
 * keystroke would be slower and pointless: the whole menu is already here. The
 * trade is that search needs JavaScript — acceptable, because without it you
 * still get the complete menu, which is the thing that actually matters.
 *
 * So the rule this follows: state that should be shareable, indexable or
 * JS-optional goes in the URL. Ephemeral local narrowing stays in the component.
 */
export function MenuToolbar({
  vegOnly,
  vegCount,
  totalCount,
  onQueryChange,
}: {
  vegOnly: boolean
  vegCount: number
  totalCount: number
  /** Raises the live query so the page can swap sections for search results. */
  onQueryChange: (query: string) => void
}) {
  const [query, setQuery] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  function setVeg(next: boolean) {
    const updated = new URLSearchParams(params.toString())
    if (next) updated.set('veg', '1')
    else updated.delete('veg')
    // `scroll: false` so toggling the filter does not throw the customer back to
    // the top of a menu they had scrolled halfway down.
    router.push(`${pathname}${updated.size ? `?${updated}` : ''}`, { scroll: false })
  }

  function update(next: string) {
    setQuery(next)
    onQueryChange(next)
  }

  // Escape clears the search rather than only blurring it, which is what the
  // key means in every search field people already use.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && query !== '') {
        update('')
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <label htmlFor="menu-search" className="sr-only">
          Search this menu
        </label>
        <input
          id="menu-search"
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => update(e.target.value)}
          placeholder="Search this menu"
          className="h-11 w-full rounded-xl border border-rule-strong bg-surface pl-10 pr-10 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand/50"
        />
        {query !== '' && (
          <button
            type="button"
            onClick={() => update('')}
            className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-ink-faint transition-colors hover:text-ink"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/*
        A real switch, not a styled div. `role="switch"` with aria-checked is what
        makes a screen reader say "Pure veg, switch, off" — the one announcement
        that tells someone both what it does and its current state.

        Only offered when it would change something: on an all-veg or all-non-veg
        menu the control is noise.
      */}
      {vegCount > 0 && vegCount < totalCount && (
        <button
          type="button"
          role="switch"
          aria-checked={vegOnly}
          onClick={() => setVeg(!vegOnly)}
          className={cn(
            'inline-flex h-11 shrink-0 items-center gap-2.5 rounded-xl px-3.5 text-sm font-semibold transition-colors',
            vegOnly
              ? 'bg-veg text-on-veg ring-1 ring-veg'
              : 'bg-surface text-ink ring-1 ring-rule-strong hover:bg-surface-sunk',
          )}
        >
          {/*
            The regulated veg mark: a green square outline with a filled dot. It is
            a legal symbol in India, so it is drawn to spec rather than
            substituted with a leaf icon, and it keeps its own colour tokens
            instead of inheriting the button's.
          */}
          <span
            className={cn(
              'grid size-4 shrink-0 place-items-center rounded-[3px] border-[1.5px]',
              vegOnly ? 'border-on-veg' : 'border-veg',
            )}
            aria-hidden="true"
          >
            <span
              className={cn(
                'size-2 rounded-full',
                vegOnly ? 'bg-on-veg' : 'bg-veg',
              )}
            />
          </span>
          Pure veg
          <span className="tabular text-xs opacity-70">{vegCount}</span>
        </button>
      )}
    </div>
  )
}
