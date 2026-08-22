import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * The heading above every home-page section.
 *
 * Extracted because five sections were each hand-rolling `text-xl font-bold`,
 * which is (a) duplication and (b) too small — at that size a section title
 * carries no more weight than the card titles beneath it, so the page reads as
 * one undifferentiated column. The references (Zomato, Swiggy, magicpin) all set
 * section titles two or three steps above their card titles, and that single
 * contrast is most of what makes a long scrolling page feel structured.
 *
 * `eyebrow` is the small line above. It exists so the title itself can stay
 * short: "Popular right now" as a title plus "what people near you are ordering"
 * as an eyebrow beats one long title that wraps awkwardly at every width.
 */
export function SectionHeading({
  title,
  eyebrow,
  action,
}: {
  title: string
  eyebrow?: string
  /** Optional "see all" affordance, aligned to the baseline of the title. */
  action?: { href: string; label: string }
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            {/* A short rule rather than a bullet: it reads as a typographic mark
                instead of a list item that lost its list. */}
            <span className="h-px w-5 bg-accent/50" aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink sm:text-[1.75rem]">
          {title}
        </h2>
      </div>

      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1 pb-1 text-sm font-semibold text-brand hover:underline"
        >
          {action.label}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}
