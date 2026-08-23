import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { SearchInput } from '@/components/search/search-input'
import { KitchenCard } from '@/components/kitchen-card'
import { DishRail } from '@/components/home/dish-rail'
import { SectionHeading } from '@/components/ui/section-heading'
import { Skeleton } from '@/components/ui/skeleton'
import SearchService from '@/services/SearchService'
import { getDeliveryLocation } from '@/lib/location'

/**
 * Search results.
 *
 * Every cuisine tile on the home page, every footer chip, and the home page's
 * search bar all pointed here, and the route did not exist — so twenty-odd links
 * on a finished-looking page were 404s.
 *
 * `searchParams` is a PROMISE in this version of Next and must be awaited. It is
 * also request data, so this route is dynamic by definition; there is nothing to
 * prerender for an arbitrary query.
 */

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}): Promise<Metadata> {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  if (query === '') {
    return { title: 'Search', alternates: { canonical: '/search' } }
  }

  return {
    title: `${query} near you`,
    description: `Kitchens and dishes matching “${query}”, from kitchens that deliver to you.`,
    // Canonical without the query: a search results page should not compete with
    // real pages in an index, and thousands of query permutations are exactly the
    // thin-content pattern that gets a site penalised.
    alternates: { canonical: '/search' },
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* autoFocus only when there is no query: arriving with a term already
          searched and having the keyboard cover the results is hostile. */}
      <SearchInput initialQuery={query} autoFocus={query === ''} />

      {query === '' ? (
        <EmptyPrompt />
      ) : (
        <Suspense key={query} fallback={<ResultsSkeleton />}>
          <Results query={query} />
        </Suspense>
      )}
    </div>
  )
}

async function Results({ query }: { query: string }) {
  const location = await getDeliveryLocation()
  const { kitchens, dishes } = await SearchService.search(
    query,
    location.lat,
    location.lng,
  )

  if (kitchens.length === 0 && dishes.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-rule-strong px-6 py-12 text-center">
        <p className="font-display text-lg font-bold text-ink">
          Nothing matching “{query}”.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
          We only search kitchens that deliver to {location.label}, and we match
          on exact spelling — so a near-miss finds nothing. Try a shorter word.
        </p>
        <Link
          href="/kitchens"
          className="mt-5 inline-block text-sm font-semibold text-brand hover:underline"
        >
          See every kitchen instead →
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-8 flex flex-col gap-12">
      {kitchens.length > 0 && (
        <section>
          <SectionHeading
            eyebrow={`${kitchens.length} match`}
            title="Kitchens"
          />
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kitchens.map((kitchen, i) => (
              <KitchenCard key={kitchen.id} kitchen={kitchen} priority={i < 2} />
            ))}
          </ul>
        </section>
      )}

      {dishes.length > 0 && (
        <section>
          <DishRail dishes={dishes} title="Dishes" />
        </section>
      )}
    </div>
  )
}

function EmptyPrompt() {
  return (
    <p className="mt-8 text-sm leading-relaxed text-ink-soft">
      Search for a dish, a cuisine, or a kitchen by name.
    </p>
  )
}

function ResultsSkeleton() {
  return (
    <div className="mt-8">
      <Skeleton className="h-8 w-40" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
