import { Suspense } from 'react'
import { IndianRupee, ShieldCheck, Timer } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Reveal } from '@/components/ui/reveal'
import { LocationBar } from '@/components/home/location-bar'
import { CuisineRail } from '@/components/home/cuisine-rail'
import { OffersRail } from '@/components/home/offers-rail'
import { KitchenList } from '@/components/home/kitchen-list'
import { DishRail } from '@/components/home/dish-rail'
import CatalogService from '@/services/CatalogService'
import PromotionService from '@/services/PromotionService'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDeliveryLocation } from '@/lib/location'
import { jsonLdScript, organizationJsonLd } from '@/lib/seo'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Order food from kitchens near you',
  description:
    'Browse real menus at real prices from kitchens near you. We charge kitchens a fraction of what the big apps do, so you pay less for the same food.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Chowk — order food from kitchens near you',
    description: 'Lower commission for kitchens. Lower prices for you.',
    url: '/',
    type: 'website',
  },
}

/**
 * How the hero describes our coverage.
 *
 * Derived from SERVING_AREAS rather than written out, so launching a second city
 * is a config edit and not a hunt through JSX for the word "Lucknow". Static on
 * purpose: this line describes where the BUSINESS operates, which is the same for
 * every visitor, unlike the delivery location below it.
 */
export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(organizationJsonLd())}
      />

      {/*
        THE ORDER IS THE POINT, and it changed deliberately.

        This page used to open with a full-height editorial hero: big display
        type, a tilted 3D card stack, a stat band. It looked good and it was the
        wrong page. The stack was `hidden lg:block`, so on any window narrower
        than 1024px the first screen had no food on it at all, and the first
        kitchen photograph sat 96% of the way down the document. Someone deciding
        what to eat had to scroll past a manifesto to see a single dish.

        Zomato's delivery listing and Swiggy's order-online page both do the same
        thing, and neither has a marketing hero: location and search, then a rail
        of circular dish photographs, then filters, then straight into the card
        grid. The reason is that these are UTILITY pages. The visitor has already
        decided to order; what they have not decided is what. Selling them the
        proposition first answers a question they did not ask.

        So: search, cuisines, kitchens. The proposition moved to the bottom, where
        somebody still browsing will reach it, and /partner keeps the full pitch.
      */}
      <section className="sticky top-0 z-30 border-b border-rule bg-surface/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <Suspense fallback={<LocationBarSkeleton />}>
            <ActiveLocationBar />
          </Suspense>
        </div>
      </section>

      {/*
        NOTHING ABOVE THE FOLD IS WRAPPED IN Reveal, and the three sections below
        were unwrapped too.

        Reveal renders `initial` on the server, so its children ship as
        opacity: 0 and only appear once motion hydrates and the viewport observer
        fires. That is fine for a section you have to scroll to. It is actively
        broken for the kitchen grid, which is now the first thing under the
        cuisine rail: the primary content of the page was invisible until
        JavaScript ran, and on a slow connection the page read as empty. A fade-in
        is a nicety; the food is the point.

        Reveal survives on WhyChowk alone, which is genuinely below the fold.

        Each section is a <section>, NOT a fragment. A fragment is not a neutral
        wrapper inside a flex container -- its children become flex children of
        the PARENT, so this column's `gap-12` was landing between a section
        heading and its own list. That was 68px of dead space directly under
        "Kitchens near Lucknow", which read as a rendering fault. One element per
        section, and it is better markup regardless.
      */}
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <CuisineRail />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-8 sm:px-6 sm:py-10">
        {/* The grid, immediately. This is what the page is for. */}
        <Suspense fallback={<ListSkeleton />}>
          <Kitchens />
        </Suspense>

        <Suspense fallback={<RailSkeleton />}>
          <Offers />
        </Suspense>

        <Suspense fallback={<DishRailSkeleton />}>
          <PopularDishes />
        </Suspense>

        {/* Below everything: the reasons, for whoever is still reading. */}
        <Reveal>
          <WhyChowk />
        </Reveal>
      </div>
    </>
  )
}

async function Offers() {
  const offers = await PromotionService.listOffers()
  if (offers.length === 0) return null
  return (
    <section>
      <OffersRail offers={offers} />
    </section>
  )
}

/**
 * Real dishes at real prices, which is what turns a directory of restaurants
 * into something you can decide dinner from.
 */
async function PopularDishes() {
  const location = await getDeliveryLocation()
  // Reuses the same request as Kitchens below: findNearby is React-`cache`d, so
  // identical arguments in one render execute once.
  const kitchens = await CatalogService.findNearby(location.lat, location.lng)
  const dishes = await CatalogService.getPopularDishes(kitchens)
  if (dishes.length === 0) return null

  return (
    <section>
      <DishRail dishes={dishes} title={`Popular near ${location.label}`} />
    </section>
  )
}

async function Kitchens() {
  const location = await getDeliveryLocation()
  // Both are React-`cache`d, so the offers call is shared with the Offers
  // section above and the kitchens call with PopularDishes -- one request each
  // per render despite three consumers.
  const [kitchens, offers] = await Promise.all([
    CatalogService.findNearby(location.lat, location.lng),
    PromotionService.listOffers(),
  ])

  return (
    <section>
      <SectionHeading
        eyebrow={`${kitchens.length} cooking near you`}
        title={`Kitchens near ${location.label}`}
        // Only offered when there is actually more to see than the list shows.
        action={kitchens.length > 3 ? { href: '/kitchens', label: 'See all' } : undefined}
      />
      <div className="mt-5">
        <KitchenList kitchens={kitchens} offers={offers} />
      </div>
    </section>
  )
}

/**
 * Three claims, each one specific and checkable.
 *
 * Deliberately not numbered: these are parallel reasons, not a sequence, and
 * numbering things that have no order is the commonest way structure lies about
 * content.
 */
function WhyChowk() {
  const points = [
    {
      Icon: IndianRupee,
      title: 'Menu prices, not marked-up ones',
      body: 'When a kitchen pays 30% commission, it raises its listed prices to survive. Charge less and that markup goes away.',
    },
    {
      Icon: Timer,
      title: 'No surprise fees at the end',
      body: 'You see the full bill — food, packaging, delivery, tax — before you confirm. Nothing appears on the last screen.',
    },
    {
      Icon: ShieldCheck,
      title: 'Every kitchen is verified',
      body: 'A valid FSSAI licence is checked before a kitchen can take a single order. No exceptions, no grace period.',
    },
  ]

  return (
    <section className="rounded-2xl bg-surface p-6 shadow-md ring-1 ring-rule/70 sm:p-8">
      <SectionHeading eyebrow="How this works" title="Why the prices are lower here" />

      <ul className="mt-6 grid gap-6 sm:grid-cols-3">
        {points.map(({ Icon, title, body }) => (
          <li key={title} className="flex flex-col gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon className="size-4.5" />
            </span>
            <h3 className="font-display text-[0.9375rem] font-bold leading-snug text-ink">
              {title}
            </h3>
            <p className="text-sm leading-relaxed text-ink-soft">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DishRailSkeleton() {
  return (
    <div>
      <Skeleton className="h-6 w-44" />
      <div className="mt-4 flex gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-56 w-[10.5rem] shrink-0 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

function RailSkeleton() {
  return (
    <div>
      <Skeleton className="h-6 w-40" />
      <div className="mt-4 flex gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 min-w-[16rem] shrink-0 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div>
      <Skeleton className="h-6 w-48" />
      <div className="mt-4 flex gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

/**
 * Resolves the delivery location on the server and hands it to the client picker.
 *
 * The split matters: the COOKIE READ is server-side, so the first paint already
 * shows the right place with no flash of a wrong city, while the picker itself
 * needs to be a client component for the geolocation prompt and the sheet. This
 * component is the seam between the two.
 */
async function ActiveLocationBar() {
  const location = await getDeliveryLocation()
  return <LocationBar label={location.label} isFallback={location.isFallback} />
}

/** Matches the location bar's height, so nothing below it shifts when it lands. */
function LocationBarSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Skeleton className="size-4 rounded-full" />
        <div>
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-1.5 h-4 w-28" />
        </div>
      </div>
      <Skeleton className="mt-3 h-11 w-full rounded-xl" />
    </div>
  )
}
