import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowRight, IndianRupee, ShieldCheck, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Reveal } from '@/components/ui/reveal'
import { LocationBar } from '@/components/home/location-bar'
import { CuisineRail } from '@/components/home/cuisine-rail'
import { OffersRail } from '@/components/home/offers-rail'
import { KitchenList } from '@/components/home/kitchen-list'
import { DishRail } from '@/components/home/dish-rail'
import { getNearbyKitchens, getOffers, getPopularDishes } from '@/lib/api/queries'
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
 * Serving area, hardcoded while there is one city.
 *
 * Called out rather than buried: real behaviour reads the customer's saved
 * address or asks for geolocation, and this placeholder should not quietly become
 * the permanent answer.
 */
const CITY = 'Lucknow'
const CENTRE = { lat: 26.85, lng: 80.947 }

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(organizationJsonLd())}
      />

      {/* --- Location and search, above everything, because they decide whether
              anything below is relevant. --- */}
      <section className="border-b border-rule bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <LocationBar city={CITY} />
        </div>
      </section>

      <Hero />

      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-10 sm:px-6 sm:py-12">
        <Reveal>
          <CuisineRail />
        </Reveal>

        {/*
          Suspense per section, so a slow offers query does not delay the kitchen
          list. Each boundary streams independently, and the hero above is static
          so it paints immediately — which is what the LCP measurement sees.
        */}
        <Suspense fallback={<RailSkeleton />}>
          <Offers />
        </Suspense>

        <Suspense fallback={<DishRailSkeleton />}>
          <PopularDishes />
        </Suspense>

        <Suspense fallback={<ListSkeleton />}>
          <Kitchens />
        </Suspense>

        <Reveal>
          <WhyChowk />
        </Reveal>

      </div>
    </>
  )
}

/**
 * The hero states the proposition in the customer's terms — cheaper food — rather
 * than the company's terms, which would be "low-commission marketplace". Nobody
 * orders dinner because of a commission structure.
 */
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-rule bg-ground">
      {/* A soft warm wash, the one decorative flourish on the page. Positioned
          behind content with pointer-events off so it can never intercept a tap. */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full opacity-[0.13] blur-3xl"
        style={{ background: 'radial-gradient(circle, #E08A3C 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="max-w-2xl font-display text-[2.5rem] font-extrabold leading-[1.03] tracking-tight text-ink sm:text-6xl">
          Dinner from down
          <br />
          <span className="text-brand">the road.</span>
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
          Real menus at the kitchen&rsquo;s own prices — not marked up to cover a
          30% commission. Order in a few taps and watch it come to you.
        </p>

        {/*
          ONE call to action, because this page has ONE audience.
          An earlier version put "List your kitchen" beside it, which made a
          customer landing page spend half its hero recruiting merchants. Partner
          recruitment lives on /partner and is linked from the footer — the same
          separation Swiggy and Zomato use, and for the same reason: a customer
          deciding what to eat is not also deciding whether to open a restaurant.
        */}
        <div className="mt-8">
          <Link href="/kitchens">
            <Button size="lg">
              Find food near me
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

async function Offers() {
  const offers = await getOffers()
  if (offers.length === 0) return null
  return (
    <Reveal>
      <OffersRail offers={offers} />
    </Reveal>
  )
}

/**
 * Real dishes at real prices, which is what turns a directory of restaurants
 * into something you can decide dinner from.
 */
async function PopularDishes() {
  const kitchens = await getNearbyKitchens(CENTRE.lat, CENTRE.lng)
  const dishes = await getPopularDishes(kitchens)
  if (dishes.length === 0) return null

  return (
    <Reveal>
      <DishRail dishes={dishes} title={`Popular in ${CITY}`} />
    </Reveal>
  )
}

async function Kitchens() {
  const kitchens = await getNearbyKitchens(CENTRE.lat, CENTRE.lng)

  return (
    <Reveal>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-ink">
          Kitchens in {CITY}
        </h2>
        {kitchens.length > 3 && (
          <Link
            href="/kitchens"
            className="rounded-sm text-sm font-semibold text-brand hover:underline"
          >
            See all
          </Link>
        )}
      </div>
      <div className="mt-4">
        <KitchenList kitchens={kitchens} />
      </div>
    </Reveal>
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
    <section className="rounded-lg border border-rule bg-surface p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold text-ink">
        Why the prices are lower here
      </h2>

      <ul className="mt-6 grid gap-6 sm:grid-cols-3">
        {points.map(({ Icon, title, body }) => (
          <li key={title} className="flex flex-col gap-2.5">
            <span className="grid size-9 place-items-center rounded-[--radius] bg-brand-soft text-brand">
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
