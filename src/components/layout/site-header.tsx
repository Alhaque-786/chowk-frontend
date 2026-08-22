import Link from 'next/link'
import { Logo } from './logo'
import { CartButton } from './cart-button'

/**
 * The site header.
 *
 * A Server Component, with the cart count isolated into its own Client
 * Component. That split matters on a menu page: the header would otherwise pull
 * the whole nav into the client bundle to render one changing number.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-sm"
          aria-label="Chowk home"
        >
          <Logo className="size-6" />
          <span className="font-display text-lg font-extrabold tracking-tight text-ink">
            Chowk
          </span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 sm:flex">
          <HeaderLink href="/kitchens">Kitchens</HeaderLink>
          <HeaderLink href="/offers">Offers</HeaderLink>
          <HeaderLink href="/orders">Orders</HeaderLink>
        </nav>

        <div className="ml-auto sm:ml-0">
          <CartButton />
        </div>
      </div>
    </header>
  )
}

function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-[--radius-sm] px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunk hover:text-ink"
    >
      {children}
    </Link>
  )
}
