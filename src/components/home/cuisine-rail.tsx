'use client'

import Link from 'next/link'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useSyncExternalStore } from 'react'
import { cn } from '@/lib/cn'
import { SectionHeading } from '@/components/ui/section-heading'

/**
 * The cuisine browse rail.
 *
 * A curated taxonomy rather than a list derived from live data, and that is
 * deliberate: these are NAVIGATION, so they must be stable enough to link to,
 * rank for, and remember. Generating them from whatever kitchens happen to be
 * online would make the rail reshuffle between visits.
 *
 * Each entry links into search, so the rail stays useful before there is enough
 * supply to justify dedicated category pages.
 */
const CUISINES: Array<{ label: string; query: string; photo: string }> = [
  { label: 'Biryani', query: 'biryani', photo: '/dishes/mutton-biryani.jpg' },
  { label: 'Kebab', query: 'kebab', photo: '/dishes/seekh-kebab.jpg' },
  { label: 'Thali', query: 'thali', photo: '/dishes/thali.jpg' },
  { label: 'Tandoori', query: 'tandoori', photo: '/dishes/tandoori-platter.jpg' },
  { label: 'Paneer', query: 'paneer', photo: '/dishes/paneer-tikka.jpg' },
  { label: 'Dal', query: 'dal', photo: '/dishes/dal-makhani.jpg' },
  { label: 'Breads', query: 'paratha', photo: '/dishes/naan.jpg' },
  { label: 'Chole', query: 'chole', photo: '/dishes/chole-bhature.jpg' },
  { label: 'Dosa', query: 'dosa', photo: '/dishes/dosa.jpg' },
  { label: 'Curry', query: 'rogan', photo: '/dishes/rogan-josh.jpg' },
  { label: 'Chaat', query: 'samosa', photo: '/dishes/samosa.jpg' },
  { label: 'Sweets', query: 'gulab', photo: '/dishes/gulab-jamun.jpg' },
  { label: 'Kheer', query: 'kheer', photo: '/dishes/kheer.jpg' },
  { label: 'Butter Chicken', query: 'butter', photo: '/dishes/butter-chicken.jpg' },
]

export function CuisineRail() {
  // `dragFree` gives the rail momentum rather than snapping, which is what makes
  // a touch scroll feel native instead of stepped.
  const [emblaRef, embla] = useEmblaCarousel({
    dragFree: true,
    containScroll: 'trimSnaps',
    align: 'start',
  })
  /*
    The arrows' enabled state lives inside embla, not in React -- embla mutates
    it on every drag frame without telling React. So it is read as an external
    store rather than mirrored into useState.

    The mirrored version had to call sync() in the effect body to catch the
    initial state (embla is already initialised by the time the effect runs, so
    its 'init' event has been and gone), and that synchronous setState on mount
    is the cascading-render pattern React 19 flags. Subscribing instead means
    there is no initial catch-up render at all: the very first render reads the
    live value.
  */
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!embla) return () => {}
      embla.on('select', onStoreChange).on('reInit', onStoreChange)
      return () => {
        embla.off('select', onStoreChange).off('reInit', onStoreChange)
      }
    },
    [embla],
  )

  // Booleans, so referential equality holds and the snapshot cannot loop.
  const canPrev = useSyncExternalStore(
    subscribe,
    () => embla?.canScrollPrev() ?? false,
    () => false,
  )
  const canNext = useSyncExternalStore(
    subscribe,
    () => embla?.canScrollNext() ?? false,
    () => false,
  )

  return (
    <div className="relative">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading eyebrow="Browse by craving" title="What are you after?" />

        {/* Arrows on pointer devices only. On touch you swipe, and a pair of
            unusable buttons is just clutter. */}
        <div className="hidden gap-1.5 sm:flex">
          <RailButton
            direction="prev"
            disabled={!canPrev}
            onClick={() => embla?.scrollPrev()}
          />
          <RailButton
            direction="next"
            disabled={!canNext}
            onClick={() => embla?.scrollNext()}
          />
        </div>
      </div>

      <div className="mt-4 overflow-hidden" ref={emblaRef}>
        <ul className="flex gap-4">
          {CUISINES.map((cuisine) => (
            <li key={cuisine.query} className="shrink-0">
              <Link
                href={`/search?q=${cuisine.query}`}
                className="group flex w-[5.5rem] flex-col items-center gap-2 sm:w-[6.5rem]"
              >
                {/*
                  A circular PHOTOGRAPH, which is the form both Zomato and Swiggy
                  use for this rail. The circle is doing real work: a round crop
                  of a plate reads as the dish at 88px, where a rectangle at that
                  size reads as a thumbnail of something.
                */}
                <span className="relative size-[5.5rem] overflow-hidden rounded-full ring-1 ring-rule/60 transition-transform duration-200 group-hover:scale-105 sm:size-[6.5rem]">
                  <Image
                    src={cuisine.photo}
                    alt=""
                    fill
                    sizes="104px"
                    className="object-cover"
                    // Above the fold now that the rail leads the page, so these
                    // are LCP candidates and must not lazy-load.
                    priority
                  />
                </span>
                <span className="text-center text-xs font-semibold leading-tight text-ink-soft group-hover:text-ink sm:text-sm">
                  {cuisine.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function RailButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next'
  disabled: boolean
  onClick: () => void
}) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Scroll left' : 'Scroll right'}
      className={cn(
        'grid size-8 place-items-center rounded-full border border-rule-strong bg-surface text-ink-soft transition-colors',
        'hover:bg-surface-sunk hover:text-ink',
        'disabled:opacity-35 disabled:hover:bg-surface',
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}
