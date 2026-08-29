import type { ReactNode } from 'react'
import { policiesUpdated } from '@/lib/business'

/**
 * Shared shell for the policy pages.
 *
 * A narrower column than the rest of the site — around 70 characters — because
 * these are the only pages here anybody reads in long form rather than scans.
 * The same measure that suits a grid of kitchen cards makes a paragraph of terms
 * genuinely harder to follow.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[68ch] px-4 py-10 sm:py-14">
      <div className="prose-chowk">{children}</div>
      <p className="mt-12 border-t border-rule pt-6 text-sm text-ink-faint">
        Last updated {policiesUpdated}.
      </p>
    </main>
  )
}
