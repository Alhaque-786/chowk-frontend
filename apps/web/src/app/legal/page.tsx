import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Policies',
  description: 'Terms of service, privacy policy, and cancellation and refund policy.',
  alternates: { canonical: '/legal' },
}

/**
 * An index for the policy pages.
 *
 * They are linked individually from the footer, so this is not the main way
 * anybody arrives. It exists because /legal is a URL people type and guess at,
 * and because a segment with a layout and no page is a 404 with a frame around it.
 */
export default function LegalIndexPage() {
  const policies = [
    {
      href: '/legal/terms',
      title: 'Terms of service',
      body: 'When an order becomes binding, who cooks your food, and what we are responsible for.',
    },
    {
      href: '/legal/refunds',
      title: 'Cancellation and refunds',
      body: 'When you can cancel free, when you cannot, and how long a refund takes to arrive.',
    },
    {
      href: '/legal/privacy',
      title: 'Privacy policy',
      body: 'What we collect, who else sees it, and the rights you have over it.',
    },
  ]

  return (
    <>
      <h1>Policies</h1>
      <p className="lead">
        The three documents that govern using Chowk. They are written to describe what the
        service actually does, and are meant to be readable.
      </p>

      <ul className="not-prose mt-8 flex list-none flex-col gap-3 pl-0">
        {policies.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="block rounded-xl border border-rule bg-surface p-4 no-underline transition-colors hover:border-brand/50"
            >
              <span className="block text-base font-semibold text-ink">{p.title}</span>
              <span className="mt-1 block text-sm text-ink-soft">{p.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
