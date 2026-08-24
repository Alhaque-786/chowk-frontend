import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight, IndianRupee, ShieldCheck, Timer } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Reveal } from '@/components/ui/reveal'
import { HeroBand } from '@/components/home/hero-band'
import { CuisineRail } from '@/components/home/cuisine-rail'
import { OffersRail } from '@/components/home/offers-rail'
import { KitchenList } from '@/components/home/kitchen-list'
import { DishRail } from '@/components/home/dish-rail'
import CatalogService from '@/services/CatalogService'
import PromotionService from '@/services/PromotionService'
import { SectionHeading } from '@/components/ui/section-heading'
import { getDeliveryLocation } from '@/lib/location-server'
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
export default async function HomePage() {
  /*
    AWAITED HERE, NOT WRAPPED IN Suspense, and that is a correction.

    Both the hero and the compact bar were behind Suspense boundaries, which put
    their skeletons into the byte stream first and appended the real content later —
    so the h1 arrived in the raw HTML AFTER four h2 elements from the footer and the
    sections below. Streaming repairs the DOM order in a browser that runs the
    inserting script; it does not repair the document a non-executing reader sees.

    A Suspense boundary earns that cost when the thing inside it waits on a network.
    This one reads a cookie: no request, no measurable delay, and a skeleton that
    could never be on screen long enough to see. So the shell waits for it, the h1
    lands first, and two skeletons that existed to cover nothing are gone.

    The sections below KEEP their boundaries — those genuinely call the API.
  */
  const location = await getDeliveryLocation()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(organizationJsonLd())}
      />

      {/*
        THE ORDER IS THE POINT, and the distinction below is a real one.

        This page used to open with a full-height editorial hero: big display type, a
        tilted 3D card stack, a stat band. It looked good and it was the wrong page.
        The stack was `hidden lg:block`, so on any window narrower than 1024px the
        first screen had no food on it at all, and the first kitchen photograph sat
        96% of the way down the document. Someone deciding what to eat had to scroll
        past a manifesto to see a single dish.

        Zomato's delivery listing and Swiggy's order-online page both do the same
        thing, and neither has a marketing hero: location and search, then a rail of
        circular dish photographs, then filters, then straight into the card grid.
        The reason is that these are UTILITY pages. The visitor has already decided
        to order; what they have not decided is what.

        The terracotta band below is NOT that hero returning, and the difference is
        not a matter of degree. It is roughly 200px tall, it contains no proposition
        and no decoration, and every element in it is a control or a label: where we
        are delivering, and a search field. The first kitchen photograph is still
        above the fold on a phone. What was wrong with the old hero was that it
        SPENT the first screen on selling; this spends it on the two questions a
        visitor actually arrives with.

        The proposition stays at the bottom, where somebody still browsing will
        reach it, and /partner keeps the full pitch.
      */}
      {/*
        THE TERRACOTTA BAND, brought across from the customer app.

        The app's home screen was signed off, so the identity travels to web rather
        than the two surfaces each having their own warm treatment. Same gradient
        stops (a shared token), same rounded bottom edge, same search card straddling
        that edge.

        The band is NOT sticky, and nothing here tries to reproduce the app's blurred
        header appearing on scroll — see the note below on why that attempt was
        removed rather than fixed.
      */}
      <HeroBand label={location.label} isFallback={location.isFallback} />

      {/*
        NO SECOND STICKY BAR HERE, and removing it fixed two bugs at once.

        The first attempt put a frosted location bar directly under the band, pinned
        with `sticky top-0 z-30` — mirroring the app's blurred header. Both were
        wrong:

          1. site-header.tsx is ALREADY `sticky top-0 z-30`. Two elements pinned to
             the same offset in the same stacking layer overlap the moment you
             scroll, and it is invisible at rest, which is where it would have been
             found — in production, by a customer.
          2. The location control then appeared TWICE within 200px, because CSS
             sticky cannot reproduce "hidden until scrolled past the hero" the way
             the app's scroll handler does. The app never shows both; web would have
             shown both, at rest, always.

        So the site header stays the one piece of persistent chrome, and the location
        control lives once — in the band. If a pinned location is wanted on long
        pages later, it belongs IN that header rather than beside it.
      */}

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
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
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
      {/*
        NO BIG HEADING HERE ANY MORE, and no h1 — the hero band now carries both.

        "Kitchens near Lucknow" was this section's title AND the page's h1. Putting
        the same words in the hero without changing this would have shipped the
        phrase twice on one screen and, worse, two h1 elements — invisible on screen
        and very visible to a crawler and to a screen reader's heading list.

        What replaces it is the app's line: a plain count above the cards. On a page
        whose subject is already stated a hundred pixels higher, a second 28px
        heading is repetition dressed as structure.
      */}
      <div className="flex items-end justify-between gap-4">
        <p className="text-sm font-semibold text-ink-soft">
          {kitchens.length} {kitchens.length === 1 ? 'kitchen' : 'kitchens'} near{' '}
          {location.label}
        </p>
        {/* Only offered when there is actually more to see than the list shows. */}
        {kitchens.length > 3 && (
          <Link
            href="/kitchens"
            className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline"
          >
            See all
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      <div className="mt-4">
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
