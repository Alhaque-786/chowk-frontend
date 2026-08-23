import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowRight, IndianRupee, ShieldCheck, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Reveal } from '@/components/ui/reveal'
import { LocationBar } from '@/components/home/location-bar'
import { CuisineRail } from '@/components/home/cuisine-rail'
import { CuisineMarquee } from '@/components/home/cuisine-marquee'
import { HeroStack } from '@/components/home/hero-stack'
import { OffersRail } from '@/components/home/offers-rail'
import { KitchenList } from '@/components/home/kitchen-list'
import { DishRail } from '@/components/home/dish-rail'
import CatalogService from '@/services/CatalogService'
import PromotionService from '@/services/PromotionService'
import { SectionHeading } from '@/components/ui/section-heading'
import { SERVING_AREAS } from '@/lib/serving-areas'
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
const COVERAGE =
  SERVING_AREAS.length === 1
    ? `Now delivering in ${SERVING_AREAS[0].city}`
    : `Now delivering in ${SERVING_AREAS.length} cities`

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(organizationJsonLd())}
      />

      {/* --- Location and search, above everything, because they decide whether
              anything below is relevant. --- */}
      {/*
        Suspense around the location bar specifically because reading the location
        cookie is what makes this route dynamic. Isolating it here means the hero
        below still streams as part of the static shell, so the LCP element does
        not wait on a request-time read.
      */}
      <section className="border-b border-rule bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <Suspense fallback={<LocationBarSkeleton />}>
            <ActiveLocationBar />
          </Suspense>
        </div>
      </section>

      <Hero />
      <CuisineMarquee />

      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-12 sm:px-6 sm:py-16">
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
    <section className="mesh-warm grain relative overflow-hidden border-b border-rule">
      {/* Layered washes ON TOP of the mesh, offset from the content so the light
          appears to come from the top-right corner and fall away. All decorative,
          all pointer-events-none so none of them can ever swallow a tap. */}
      <div
        className="pointer-events-none absolute -right-40 -top-56 size-[46rem] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, #F5C77E 0%, transparent 68%)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-64 -left-40 size-[36rem] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #C2542C 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
        {/*
          Two columns from lg up, one below. The copy leads on mobile because the
          stack is decoration -- on a phone the proposition should occupy the
          fold, not the artwork.
        */}
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-surface/80 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand ring-1 ring-brand/15 backdrop-blur">
              <span className="relative flex size-1.5">
                {/* A live dot. Signals "kitchens are cooking right now", which is
                    the one thing a hungry visitor wants to know first. */}
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-veg opacity-70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-veg" />
              </span>
              {COVERAGE}
            </span>

            {/*
              Fluid display type via clamp(), not a stack of breakpoint classes.
              A headline this large has to track the viewport continuously --
              stepped sizes leave it either cramped at 900px or overflowing at
              420px, and the whole editorial effect depends on it filling its
              measure exactly.
            */}
            <h1
              className="mt-6 max-w-[20ch] font-display font-extrabold leading-[0.98] tracking-[-0.03em] text-ink"
              style={{ fontSize: 'clamp(2.75rem, 6.2vw, 4.75rem)' }}
            >
              Dinner from
              <br />
              down the{' '}
              {/* The one gradient-filled word on the page. Any more and the
                  emphasis stops meaning anything. */}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(100deg, #C2542C 0%, #E08A3C 55%, #C9A227 100%)' }}
              >
                road
              </span>
              .
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
              Real menus at the kitchen&rsquo;s own prices — not marked up to cover
              a 30% commission. Order in a few taps and watch it come to you.
            </p>

            {/*
              ONE call to action, because this page has ONE audience. An earlier
              version put "List your kitchen" beside it, which made a customer
              landing page spend half its hero recruiting merchants. Partner
              recruitment lives on /partner and is linked from the footer -- the
              same separation Swiggy and Zomato use, and for the same reason: a
              customer deciding what to eat is not also deciding whether to open
              a restaurant.
            */}
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/kitchens">
                <Button size="lg">
                  Find food near me
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/offers">
                <Button size="lg" variant="secondary">
                  See today&rsquo;s offers
                </Button>
              </Link>
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-rule pt-7">
              {[
                { value: '28', unit: 'min', label: 'Typical delivery' },
                { value: '6', unit: '%', label: 'Commission we charge' },
                { value: '0', unit: '₹', label: 'Surge pricing, ever' },
              ].map((stat) => (
                <div key={stat.label}>
                  <dd className="font-display text-3xl font-extrabold tracking-tight text-ink">
                    {/* .tabular locks digit widths, so these never jitter if the
                        numbers become live figures from analytics later. */}
                    <span className="tabular">{stat.value}</span>
                    <span className="text-lg text-accent">{stat.unit}</span>
                  </dd>
                  <dt className="mt-1 text-xs leading-snug text-ink-faint">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Hidden below lg rather than reflowed: three tilted cards at phone
              width would be a cramped smudge, and the copy is the priority. */}
          <div className="hidden lg:block">
            <HeroStack />
          </div>
        </div>
      </div>
    </section>
  )
}

async function Offers() {
  const offers = await PromotionService.listOffers()
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
  const location = await getDeliveryLocation()
  // Reuses the same request as Kitchens below: findNearby is React-`cache`d, so
  // identical arguments in one render execute once.
  const kitchens = await CatalogService.findNearby(location.lat, location.lng)
  const dishes = await CatalogService.getPopularDishes(kitchens)
  if (dishes.length === 0) return null

  return (
    <Reveal>
      <DishRail dishes={dishes} title={`Popular near ${location.label}`} />
    </Reveal>
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
    <Reveal>
      <SectionHeading
        eyebrow={`${kitchens.length} cooking near you`}
        title={`Kitchens near ${location.label}`}
        // Only offered when there is actually more to see than the list shows.
        action={kitchens.length > 3 ? { href: '/kitchens', label: 'See all' } : undefined}
      />
      <div className="mt-5">
        <KitchenList kitchens={kitchens} offers={offers} />
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
