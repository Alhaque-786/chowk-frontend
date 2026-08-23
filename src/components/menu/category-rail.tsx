'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * The sticky category strip, with the current section highlighted as you scroll.
 *
 * Two things make this worth building rather than settling for a list of links.
 *
 * SCROLL-SPY. On a long menu the useful question is not "where can I jump to" but
 * "where am I". An IntersectionObserver answers it for free — no scroll listener,
 * no getBoundingClientRect on every frame, no layout thrash. The browser does the
 * work off the main thread and tells us only when a section crosses the line.
 *
 * ANCHOR LINKS UNDERNEATH. Every chip is a real `<a href="#cat-…">`, so jumping
 * works with JavaScript disabled, the browser owns the smooth scroll, and the
 * position is in the URL — which means back returns you to the section you came
 * from. The observer only decorates; it never carries the navigation.
 *
 * The active chip scrolls itself into view horizontally, because a highlight you
 * cannot see is worse than no highlight: it moves off screen exactly when the
 * menu gets long enough for the rail to matter.
 */
export function CategoryRail({
  categories,
  variant = 'rail',
}: {
  categories: Array<{ id: string; name: string; count: number }>
  /**
   * `rail` is the horizontal strip for narrow screens; `list` is the vertical
   * index for wide ones.
   *
   * One component with two presentations rather than two components, because the
   * scroll-spy is the hard part and duplicating it would mean two observers
   * fighting over the same sections and two chances to get the rootMargin wrong.
   * The page renders exactly one of them at a time.
   */
  variant?: 'rail' | 'list'
}) {
  const [activeId, setActiveId] = useState<string | null>(categories[0]?.id ?? null)
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (categories.length === 0) return

    const sections = categories
      .map((c) => document.getElementById(`cat-${c.id}`))
      .filter((el): el is HTMLElement => el !== null)
    if (sections.length === 0) return

    /*
      rootMargin does the real work here.

      A section counts as "current" only once its heading passes the top of the
      viewport, and stops counting when it leaves the bottom third. Without that
      offset, whichever section is merely VISIBLE wins — and on a tall screen
      three are visible at once, so the highlight flickers between them as you
      scroll. `-45% 0px -50% 0px` narrows the trigger to a band near the top.
    */
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id.replace(/^cat-/, ''))
        }
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    )

    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [categories])

  // Keep the active chip in view — horizontal rail only. `nearest` rather than
  // `center`, so it moves only when it has to; recentring on every section is
  // motion nobody asked for. Skipped for the vertical list, which is short enough
  // to be fully visible and where scrolling it would move the page.
  useEffect(() => {
    if (variant !== 'rail' || !activeId || !railRef.current) return
    const chip = railRef.current.querySelector<HTMLElement>(`[data-cat="${activeId}"]`)
    chip?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [activeId, variant])

  if (categories.length < 2) return null

  if (variant === 'list') {
    return (
      <nav aria-label="Menu categories">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">
          On the menu
        </p>
        <ul className="flex flex-col gap-0.5">
          {categories.map((category) => {
            const active = category.id === activeId
            return (
              <li key={category.id}>
                <a
                  href={`#cat-${category.id}`}
                  data-cat={category.id}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex items-baseline justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-brand-soft font-semibold text-brand'
                      : 'text-ink-soft hover:bg-surface-sunk hover:text-ink',
                  )}
                >
                  <span className="truncate">{category.name}</span>
                  <span className="tabular shrink-0 text-xs text-ink-faint">
                    {category.count}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    )
  }

  return (
    <nav
      aria-label="Menu categories"
      /*
        NO edge-fade here, deliberately.

        The fade was eating the first chip: it sits flush against the left edge,
        which is exactly where the mask is most opaque, so the active category
        rendered half-dissolved and looked like a rendering fault. A fade is right
        for continuous content like a marquee and wrong for discrete controls —
        a chip is either legible or it is broken.
      */
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      ref={railRef}
    >
      <ul className="flex w-max gap-2 pb-0.5">
        {categories.map((category) => {
          const active = category.id === activeId
          return (
            <li key={category.id}>
              <a
                href={`#cat-${category.id}`}
                data-cat={category.id}
                // Announced, so a screen reader user is told which section they
                // are in rather than having to infer it from the styling.
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-ink text-ink-inverse'
                    : 'bg-surface text-ink-soft ring-1 ring-rule hover:text-ink',
                )}
              >
                {category.name}
                <span className="tabular text-xs opacity-60">{category.count}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
