import { Tag } from 'lucide-react'
import { formatRupees } from '@/lib/format'
import type { Offer } from '@/lib/api/types'
import { SectionHeading } from '@/components/ui/section-heading'

/**
 * Live offers.
 *
 * Codes are shown in full rather than hidden behind "view offer". A customer who
 * can read the code can decide whether it applies to them before tapping, which
 * is the difference between an offer and an advert.
 */
export function OffersRail({ offers }: { offers: Offer[] }) {
  if (offers.length === 0) return null

  return (
    <div>
      <SectionHeading eyebrow="Live deals" title="Offers on right now" />

      {/* Scrolls inside its own container, so the page body never moves
          sideways. The negative margin lets cards bleed to the screen edge,
          which is what signals "there is more to the right". */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <ul className="flex gap-3">
          {offers.map((offer) => (
            <li
              key={offer.code}
              className="flex min-w-[16rem] shrink-0 flex-col gap-2 rounded-2xl bg-accent-soft p-4 ring-1 ring-accent/20"
            >
              <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-dashed border-accent/50 bg-surface px-2 py-1">
                <Tag className="size-3 text-accent" />
                <span className="font-display text-sm font-bold tracking-wide text-accent">
                  {offer.code}
                </span>
              </span>

              <p className="text-sm font-medium leading-snug text-ink">
                {offer.description}
              </p>

              <p className="mt-auto text-xs text-ink-soft tabular">
                {offer.min_order_minor > 0
                  ? `On orders over ${formatRupees(offer.min_order_minor)}`
                  : 'No minimum order'}
                {offer.first_order_only && ' · first order only'}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
