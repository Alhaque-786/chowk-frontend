'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { KitchenCard } from '@/components/kitchen-card'
import { Button } from '@/components/ui/button'
import { FilterChips, type Filter } from './filter-chips'
import type { NearbyKitchen } from '@/lib/api/types'

/**
 * The kitchen list with its filters.
 *
 * A Client Component because filtering is interactive, but it receives its data
 * as a prop from the server — so the list is server-rendered and indexable, and
 * only the filter behaviour is hydrated. Fetching on the client instead would
 * hide every kitchen from search engines, which for a marketplace is the whole
 * SEO story.
 */
export function KitchenList({ kitchens }: { kitchens: NearbyKitchen[] }) {
  const [filters, setFilters] = useState<Set<Filter>>(new Set())

  const visible = useMemo(() => {
    let list = kitchens
    if (filters.has('open')) list = list.filter((k) => k.is_open)
    if (filters.has('rated')) {
      list = list.filter((k) => k.rating_count > 0 && k.rating_average >= 4)
    }
    if (filters.has('fast')) list = list.filter((k) => k.avg_prep_minutes < 30)

    // Open kitchens first regardless of filters. A closed kitchen at the top of
    // the list is a wasted tap, and sorting is cheaper than explaining.
    return [...list].sort((a, b) => Number(b.is_open) - Number(a.is_open))
  }, [kitchens, filters])

  if (kitchens.length === 0) return <EmptyState />

  return (
    <div>
      <FilterChips
        active={filters}
        onChange={setFilters}
        resultCount={visible.length}
      />

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-rule-strong px-6 py-10 text-center">
          <p className="font-display text-base font-semibold text-ink">
            Nothing matches those filters
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            Try removing one to see more kitchens.
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => setFilters(new Set())}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((kitchen, i) => (
            <KitchenCard
              key={kitchen.id}
              kitchen={kitchen}
              // The first two are above the fold on most phones, so they load
              // eagerly rather than waiting for the intersection observer.
              priority={i < 2}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The genuine state of a new marketplace, so it is written as a real screen
 * rather than treated as an edge case.
 */
function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-rule-strong px-6 py-14 text-center">
      <p className="font-display text-lg font-bold text-ink">
        No kitchens here yet
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
        We are signing up kitchens in your area now. If you run one, listing takes
        about ten minutes and we charge a fraction of what the big apps do.
      </p>
      <Link href="/partner" className="mt-5 inline-block">
        <Button>List your kitchen</Button>
      </Link>
    </div>
  )
}
