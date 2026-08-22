import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Hanken_Grotesk } from 'next/font/google'
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
  title: {
    default: 'Chowk',
    template: '%s · Chowk',
  },
  description: 'Order from kitchens near you.',
}

export const viewport: Viewport = {
  // Food ordering is mobile-first. `maximum-scale` is deliberately NOT set:
  // capping zoom breaks the page for anyone who needs to enlarge text, and it is
  // an accessibility failure rather than a design choice.
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf9f5' },
    { media: '(prefers-color-scheme: dark)', color: '#14120f' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${bricolage.variable} ${hanken.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
