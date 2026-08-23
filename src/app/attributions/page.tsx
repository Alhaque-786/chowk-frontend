import type { Metadata } from 'next'
import Link from 'next/link'
import photos from '@/lib/dish-photos.generated.json'

/**
 * Photo credits.
 *
 * THIS PAGE IS A LEGAL REQUIREMENT, not a courtesy. Most of the images currently
 * on the site are CC BY or CC BY-SA, and both licences require attributing the
 * author and naming the licence wherever the work is used. Shipping the photos
 * without this page would make every listing page an infringement.
 *
 * It is also the honest record of a temporary situation: none of these are
 * photographs of food from the kitchens listed on this site. That is stated at
 * the top rather than buried, because a customer is entitled to know that a photo
 * is illustrative. Replacing these with real photography removes the images from
 * the manifest and empties this page on its own — nothing here needs unwinding by
 * hand.
 */

export const metadata: Metadata = {
  title: 'Photo credits',
  description:
    'Attribution and licensing for the photography used on this site.',
  alternates: { canonical: '/attributions' },
  // Not useful in search results, and it should never outrank a kitchen.
  robots: { index: false, follow: true },
}

type Photo = {
  file: string
  sourcePage: string
  licence: string
  licenceUrl?: string
  author: string
  credit?: string
}

export default function AttributionsPage() {
  const entries = Object.entries(photos as Record<string, Photo>).sort(
    ([a], [b]) => a.localeCompare(b),
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Photo credits
      </h1>

      <div className="mt-6 rounded-2xl bg-accent-soft p-5 ring-1 ring-accent/20">
        <p className="text-sm font-semibold text-ink">
          These are illustrative photographs, not pictures of the food we cook.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Every image below is licensed for reuse and credited to its
          photographer. None of them was taken at a kitchen listed on this site.
          We are replacing them with photographs of the actual dishes; until then
          treat a picture as an indication of the kind of dish, not of the exact
          plate that arrives.
        </p>
      </div>

      <p className="mt-8 text-sm leading-relaxed text-ink-soft">
        {entries.length} images, sourced from{' '}
        <a
          href="https://commons.wikimedia.org"
          className="font-semibold text-brand hover:underline"
          rel="noreferrer"
          target="_blank"
        >
          Wikimedia Commons
        </a>
        . Licence names link to the full licence text.
      </p>

      <ul className="mt-6 divide-y divide-rule">
        {entries.map(([slug, photo]) => (
          <li key={slug} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-3">
            <span className="font-display text-sm font-bold text-ink">{slug}</span>
            <span className="text-sm text-ink-soft">
              by {photo.author || 'Unknown'}
            </span>
            <span className="text-ink-faint">·</span>
            {photo.licenceUrl ? (
              <a
                href={photo.licenceUrl}
                className="text-sm font-medium text-brand hover:underline"
                rel="license noreferrer"
                target="_blank"
              >
                {photo.licence}
              </a>
            ) : (
              <span className="text-sm text-ink-soft">{photo.licence}</span>
            )}
            <span className="text-ink-faint">·</span>
            <a
              href={photo.sourcePage}
              className="text-sm text-ink-faint hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              source
            </a>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="mt-10 inline-block text-sm font-semibold text-brand hover:underline"
      >
        ← Back to food
      </Link>
    </div>
  )
}
