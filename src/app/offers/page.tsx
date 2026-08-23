import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { Tag, TicketX } from 'lucide-react'
import { SectionHeading } from '@/components/ui/section-heading'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRupees } from '@/lib/format'
import PromotionService from '@/services/PromotionService'
import CatalogService from '@/services/CatalogService'
import { getDeliveryLocation } from '@/lib/location-server'
import type { Offer } from '@/lib/api/types'

/**
 * Every live offer.
 *
 * Shows which kitchens an offer covers, which is only possible because the API
 * now returns `kitchen_ids` — before that this page could have listed codes but
 * not said where any of them worked, which is the one thing a customer needs.
 *
 * A platform-wide offer (`kitchen_ids: []`) is labelled as such rather than left
 * blank. Blank reads as missing data.
 */

export const metadata: Metadata = {
  title: 'Offers and coupon codes',
  description:
    'Every live offer, with the minimum order and the kitchens it works at. No hidden conditions.',
  alternates: { canonical: '/offers' },
}

export default function OffersPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<OffersSkeleton />}>
        <LiveOffers />
      </Suspense>
    </div>
  )
}

async function LiveOffers() {
  const location = await getDeliveryLocation()
  const [offers, kitchens] = await Promise.all([
    PromotionService.listOffers(),
    CatalogService.findNearby(location.lat, location.lng),
  ])

  // Name lookup, so a scoped offer can say WHICH kitchen rather than printing a
  // UUID. A kitchen outside the delivery radius will not be in this map, and the
  // fallback copy below handles that rather than rendering an empty name.
  const nameOf = new Map(kitchens.map((k) => [k.id, k.name]))

  if (offers.length === 0) {
    return (
      <>
        <SectionHeading eyebrow="Live deals" title="Offers on right now" />
        <EmptyState
          className="mt-6"
          icon={TicketX}
          title="No offers running today"
          body="We would rather show you nothing than an expired code. Prices here are already lower than the big apps, because kitchens pay us less."
          action={
            <Link
              href="/kitchens"
              className="text-sm font-semibold text-brand hover:underline"
            >
              Browse kitchens instead →
            </Link>
          }
        />
      </>
    )
  }

  return (
    <>
      <SectionHeading
        as="h1"
        eyebrow={`${offers.length} live`}
        title="Offers on right now"
      />
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {offers.map((offer) => (
          <li
            key={offer.code}
            className="flex flex-col gap-3 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-rule/70"
          >
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-accent/50 bg-accent-soft px-2.5 py-1">
              <Tag className="size-3.5 text-accent" />
              <span className="font-display text-sm font-bold tracking-wide text-accent">
                {offer.code}
              </span>
            </span>

            <p className="font-display text-base font-bold leading-snug text-ink">
              {offer.description}
            </p>

            <dl className="mt-auto flex flex-col gap-1 text-xs text-ink-soft">
              <div className="flex gap-1.5">
                <dt className="text-ink-faint">Minimum order</dt>
                <dd className="tabular font-semibold text-ink">
                  {offer.min_order_minor > 0
                    ? formatRupees(offer.min_order_minor)
                    : 'None'}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-faint">Works at</dt>
                <dd className="font-semibold text-ink">{scopeLabel(offer, nameOf)}</dd>
              </div>
              {offer.first_order_only && (
                <div className="mt-1 text-accent">First order only</div>
              )}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * Describes an offer's reach in words.
 *
 * The empty-array case is the important one: it means EVERY kitchen, and reading
 * it as "none" would hide exactly the offers we most want to advertise.
 */
function scopeLabel(offer: Offer, nameOf: Map<string, string>): string {
  const ids = offer.kitchen_ids ?? []
  if (ids.length === 0) return 'Every kitchen'

  const named = ids.map((id) => nameOf.get(id)).filter(Boolean) as string[]
  // Falls back to a count when a scoped kitchen is outside the delivery radius:
  // naming zero of three kitchens would read as a bug.
  if (named.length === 0) {
    return ids.length === 1 ? '1 kitchen' : `${ids.length} kitchens`
  }
  if (named.length <= 2) return named.join(' and ')
  return `${named[0]} and ${named.length - 1} more`
}

function OffersSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-56" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
