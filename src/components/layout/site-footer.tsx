import Link from 'next/link'
import { Logo } from './logo'

/**
 * The site footer.
 *
 * Two jobs beyond navigation. It carries the compliance links an Indian food
 * platform is legally obliged to publish — FSSAI licence details, terms, refund
 * and privacy policy — and it gives search engines internal links to the pages
 * that would otherwise be orphaned. Both are real reasons; a footer full of
 * decorative links is just weight.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-rule bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2" aria-label="Chowk home">
              <Logo className="size-6" />
              <span className="font-display text-lg font-extrabold tracking-tight text-ink">
                Chowk
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
              A marketplace for kitchens near you. Lower commission for
              restaurants, lower prices at the till.
            </p>
          </div>

          <FooterColumn
            title="Order"
            links={[
              { label: 'Browse kitchens', href: '/kitchens' },
              { label: 'Offers', href: '/offers' },
              { label: 'Your orders', href: '/orders' },
            ]}
          />

          <FooterColumn
            title="Partners"
            links={[
              { label: 'List your kitchen', href: '/partner' },
              { label: 'How commission works', href: '/partner/pricing' },
              { label: 'Partner sign in', href: '/kitchen' },
            ]}
          />

          <FooterColumn
            title="Legal"
            links={[
              { label: 'Terms of service', href: '/legal/terms' },
              { label: 'Privacy policy', href: '/legal/privacy' },
              { label: 'Refund policy', href: '/legal/refunds' },
              { label: 'Contact support', href: '/support' },
            ]}
          />
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-rule pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Chowk. All rights reserved.</p>
          {/*
            FSSAI licence display is mandatory for a food business operator in
            India, including an aggregator. It belongs in the footer of every
            page, not on an about page nobody visits.
          */}
          <p className="tabular">
            FSSAI Licence:{' '}
            <span className="text-ink-soft">
              {process.env.NEXT_PUBLIC_FSSAI_LICENCE ?? 'pending'}
            </span>
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: Array<{ label: string; href: string }>
}) {
  return (
    <nav aria-labelledby={`footer-${title.toLowerCase()}`}>
      <h2
        id={`footer-${title.toLowerCase()}`}
        className="font-display text-xs font-semibold uppercase tracking-wider text-ink-faint"
      >
        {title}
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="rounded-sm text-sm text-ink-soft transition-colors hover:text-brand"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
