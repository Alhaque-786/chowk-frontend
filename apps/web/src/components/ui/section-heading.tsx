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
 *
 * `as` exists because exactly ONE heading per page must be the h1, and which one
 * depends on the page rather than on the component. The home page had NO h1 for a
 * while: it used to live in the hero, and removing the hero took it with it, so
 * the document opened on an h2 with nothing above it. That is invisible on screen
 * and very visible to a crawler and a screen-reader's heading list.
 *
 * The listing heading is the right h1 here, and it is what both references do --
 * Zomato's is "Best Restaurants in Gurgaon", Swiggy's is "Restaurants with online
 * food delivery in Gurgaon". The page is a list of kitchens; that is its subject.
 */
export function SectionHeading({
  title,
  eyebrow,
  action,
  as: Heading = 'h2',
}: {
  title: string
  eyebrow?: string
  /** Optional "see all" affordance, aligned to the baseline of the title. */
  action?: { href: string; label: string }
  /**
   * The heading level. Defaults to h2; pass 'h1' on the ONE heading that is the
   * page's subject. Purely semantic -- the visual style is identical either way,
   * so promoting a heading never changes the design.
   */
  as?: 'h1' | 'h2'
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
        <Heading className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink sm:text-[1.75rem]">
          {title}
        </Heading>
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
