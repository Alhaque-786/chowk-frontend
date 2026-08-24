'use client'

import { useState } from 'react'
import { Check, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Quick filters over the kitchen list.
 *
 * Client-side over an already-fetched list rather than a round trip per toggle:
 * the home page shows a handful of kitchens, so refetching to hide two of them
 * would add latency to something that should feel instant. This flips to a
 * server-side query on the full /kitchens page, where the list is long enough
 * that filtering in the browser would mean shipping all of it first.
 */
export type Filter = 'open' | 'rated' | 'fast'

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'open', label: 'Open now' },
  { id: 'rated', label: 'Rated 4.0+' },
  { id: 'fast', label: 'Under 30 min' },
]

export function FilterChips({
  active,
  onChange,
  resultCount,
}: {
  active: Set<Filter>
  onChange: (next: Set<Filter>) => void
  resultCount: number
}) {
  const [announce, setAnnounce] = useState('')

  function toggle(id: Filter) {
    const next = new Set(active)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
    // Filtering changes the list without a navigation, so the new count has to
    // be announced or a screen reader user gets no feedback at all.
    setAnnounce(`${resultCount} kitchens match`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint">
        <SlidersHorizontal className="size-3.5" />
        Filter
      </span>

      {FILTERS.map((filter) => {
        const on = active.has(filter.id)
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => toggle(filter.id)}
            aria-pressed={on}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              on
                ? 'border-brand bg-brand text-brand-ink'
                : 'border-rule-strong bg-surface text-ink-soft hover:border-brand/40 hover:text-ink',
            )}
          >
            {on && <Check className="size-3" />}
            {filter.label}
          </button>
        )
      })}

      <span aria-live="polite" className="sr-only">
        {announce}
      </span>
    </div>
  )
}
