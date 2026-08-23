import type { Metadata } from 'next'
import { Suspense } from 'react'
import { KitchenList } from '@/components/home/kitchen-list'
import { SectionHeading } from '@/components/ui/section-heading'
import { Skeleton } from '@/components/ui/skeleton'
import CatalogService from '@/services/CatalogService'
import PromotionService from '@/services/PromotionService'
import { getDeliveryLocation } from '@/lib/location'

/**
 * The full kitchen listing.
 *
 * This is where the hero's primary call to action pointed, and it did not exist —
 * "Find food near me" was a 404. Worth stating plainly, because a page that looks
 * finished while its main button is dead is worse than an obviously unfinished
 * one: nothing about the home page suggested anything was missing.
 *
 * Deliberately thin. It is the same KitchenList the home page renders, without
 * the surrounding rails, so filtering and card layout stay in one component
 * rather than being reimplemented per page.
 */

export const metadata: Metadata = {
  title: 'All kitchens near you',
  description:
    'Every kitchen delivering to you right now, with live open hours, ratings and delivery times.',
  alternates: { canonical: '/kitchens' },
}

export default function KitchensPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<ListSkeleton />}>
        <AllKitchens />
      </Suspense>
    </div>
  )
}

async function AllKitchens() {
  const location = await getDeliveryLocation()
  const [kitchens, offers] = await Promise.all([
    // A wider radius than the home page's default: someone who tapped through to
    // the full list has already seen the short one and wants more, not the same
    // set again.
    CatalogService.findNearby(location.lat, location.lng, 15000),
    PromotionService.listOffers(),
  ])

  return (
    <>
      <SectionHeading
        as="h1"
        eyebrow={`${kitchens.length} delivering to ${location.label}`}
        title="All kitchens near you"
      />
      <div className="mt-6">
        <KitchenList kitchens={kitchens} offers={offers} />
      </div>
    </>
  )
}

function ListSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-64" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
