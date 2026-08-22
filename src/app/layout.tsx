import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Hanken_Grotesk } from 'next/font/google'
import { CartBar } from '@/components/layout/cart-bar'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { SITE_NAME, SITE_URL } from '@/lib/seo'
import { THEME_GROUND } from '@/lib/theme'
import './globals.css'

/**
 * next/font self-hosts these at build time, so there is no request to Google at
 * runtime and no layout shift while a face loads. The CSS variables are what
 * globals.css maps onto Tailwind's font utilities.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  // Only the weights actually used. Every extra weight is bytes on a phone.
  weight: ['500', '600', '800'],
  display: 'swap',
})

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  /**
   * metadataBase makes every relative URL in metadata absolute.
   *
   * Without it, Open Graph and canonical tags emit relative paths, which
   * crawlers and social scrapers cannot resolve — so link previews silently
   * break and canonicals point nowhere. It is the single easiest SEO detail to
   * miss because nothing on the page looks wrong.
   */
  metadataBase: new URL(SITE_URL),

  title: {
    default: `${SITE_NAME} — order food from kitchens near you`,
    // Page titles become "Khansama · Chowk". The site name goes last so the
    // distinctive part survives truncation in a search result or a browser tab.
    template: `%s · ${SITE_NAME}`,
  },
  description:
    'Order food from kitchens near you. Lower commission for restaurants, lower prices at the till.',

  applicationName: SITE_NAME,
  // en-IN, not en-US: currency, digit grouping and spelling all follow.
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: SITE_NAME,
    url: SITE_URL,
  },
  twitter: {
    // Large image, because a food card with a thumbnail wastes the format.
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Lets Google show a full-length snippet and a large image preview rather
      // than defaulting to a conservative truncation.
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  formatDetection: {
    // iOS Safari otherwise turns order numbers and prices into phone links,
    // which looks like a rendering bug on an order confirmation.
    telephone: false,
  },
}

export const viewport: Viewport = {
  // Food ordering is mobile-first. `maximum-scale` is deliberately NOT set:
  // capping zoom breaks the page for anyone who needs to enlarge text, and it is
  // an accessibility failure rather than a design choice.
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_GROUND.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_GROUND.dark },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${bricolage.variable} ${hanken.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        {/*
          A skip link is the first focusable element on every page. Without it,
          a keyboard user tabs through the entire header and nav on every
          navigation before reaching the content.
        */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[--radius] focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-ink"
        >
          Skip to content
        </a>

        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        {/* Global: once something is in the cart, checkout must be reachable
            from any page without hunting for the header. */}
        <CartBar />
      </body>
    </html>
  )
}
