'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { KitchenCard } from '@/components/kitchen-card'
import { buildOfferIndex } from '@/lib/offer-index'
import { EmptyState } from '@/components/ui/empty-state'
import { MapPinOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterChips, type Filter } from './filter-chips'
import type { NearbyKitchen, Offer } from '@/lib/api/types'

/**
 * The kitchen list with its filters.
 *
 * A Client Component because filtering is interactive, but it receives its data
 * as a prop from the server — so the list is server-rendered and indexable, and
 * only the filter behaviour is hydrated. Fetching on the client instead would
 * hide every kitchen from search engines, which for a marketplace is the whole
 * SEO story.
 */
export function KitchenList({
  kitchens,
  offers = [],
}: {
  kitchens: NearbyKitchen[]
  /** Live offers, so each card can advertise the one that applies to it. */
  offers?: Offer[]
}) {
  const [filters, setFilters] = useState<Set<Filter>>(new Set())

  // Indexed once per offers change, not per card render: filtering inside the
  // card would be O(kitchens x offers) and would scatter the
  // empty-means-everywhere rule across call sites.
  const offerIndex = useMemo(() => buildOfferIndex(offers), [offers])

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

  if (kitchens.length === 0) {
    return (
      <EmptyState
        icon={MapPinOff}
        title="No kitchens here yet"
        body="We are only in Lucknow so far. Change your location, or check back — this is supply, not interest."
        action={
          <Link href="/partner">
            <Button variant="secondary">Know a kitchen? Tell them</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <FilterChips
        active={filters}
        onChange={setFilters}
        resultCount={visible.length}
      />

      {visible.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Nothing matches those filters"
          body="Every kitchen was filtered out. Removing one will bring some back."
          action={
            <Button variant="secondary" onClick={() => setFilters(new Set())}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((kitchen, i) => (
            <KitchenCard
              key={kitchen.id}
              kitchen={kitchen}
              offer={offerIndex.for(kitchen.id)}
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
