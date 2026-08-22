'use client'

import Link from 'next/link'
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
const CUISINES: Array<{ label: string; query: string; from: string; to: string }> = [
  { label: 'Biryani', query: 'biryani', from: '#F5C77E', to: '#D97706' },
  { label: 'Thali', query: 'thali', from: '#CBD9A3', to: '#7F9A4E' },
  { label: 'Dosa', query: 'dosa', from: '#F0CBA8', to: '#C98B4B' },
  { label: 'Kebab', query: 'kebab', from: '#E4B7B2', to: '#B5625C' },
  { label: 'Chinese', query: 'chinese', from: '#E9A17C', to: '#C2542C' },
  { label: 'Chaat', query: 'chaat', from: '#EFD9A0', to: '#C9A227' },
  { label: 'Paratha', query: 'paratha', from: '#D9C7A0', to: '#A78B5A' },
  { label: 'Sweets', query: 'sweets', from: '#E9C0D3', to: '#B45C86' },
  { label: 'Rolls', query: 'roll', from: '#C9D8B6', to: '#6E8B4E' },
  { label: 'Pizza', query: 'pizza', from: '#F3BFA6', to: '#C55A2B' },
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
                className="group flex w-[4.5rem] flex-col items-center gap-2"
              >
                <span
                  className="relative grid size-[4.5rem] place-items-center overflow-hidden rounded-full transition-transform duration-200 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${cuisine.from} 0%, ${cuisine.to} 100%)`,
                  }}
                  aria-hidden="true"
                >
                  <span className="relative font-display text-base font-extrabold text-white/90">
                    {cuisine.label.slice(0, 2)}
                  </span>
                </span>
                <span className="text-center text-xs font-medium leading-tight text-ink-soft group-hover:text-ink">
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
