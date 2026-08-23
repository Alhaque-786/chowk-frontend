import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * The one empty state.
 *
 * There were nine of these, hand-rolled, in seven files: no kitchens nearby, no
 * search results, nothing on this menu, nothing vegetarian, empty cart, not
 * signed in, no offers, order not found. Every one was
 * `rounded-2xl border border-dashed border-rule-strong px-6 py-12 text-center`
 * plus two paragraphs — and they had already drifted: py-10, py-12 and py-14 all
 * appeared, and one used `font-semibold` where the rest used `font-bold`.
 *
 * That drift is the real argument. An empty state is what somebody sees at the
 * exact moment the product has nothing to offer them, and it is the last place
 * inconsistency should show. Nine copies means nine chances to get the spacing,
 * the wording register, or the missing next action wrong.
 *
 * WHAT THIS ENFORCES, by being the only way to render one:
 *
 *   - A title that says what happened, not "Oops".
 *   - A body that explains WHY, because an empty list with no reason reads as a
 *     bug ("nothing nearby" versus "we only deliver in Lucknow").
 *   - Somewhere to go next. Optional in the type because a genuinely terminal
 *     state exists, but the parameter's presence is the reminder.
 *
 * A Server Component: it renders text and takes no interaction, so an empty state
 * ships no JavaScript. The action passed in may be a client component; that is the
 * caller's choice and does not pull this one over.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  tone = 'outlined',
  className,
}: {
  /** Optional, and used sparingly. An icon on every empty state stops meaning
   *  anything; it earns its place when the state is unusual rather than routine. */
  icon?: LucideIcon
  title: string
  body: string
  /** A link or button. Absent only when there is genuinely nowhere to go. */
  action?: React.ReactNode
  /**
   * `outlined` is the default: a dashed box reads as "a container with nothing in
   * it", which is exactly the message.
   *
   * `plain` is for when the empty state is already inside a card or a sheet,
   * where a second border would be a box inside a box.
   */
  tone?: 'outlined' | 'plain'
  className?: string
}) {
  return (
    <div
      className={cn(
        'px-6 py-12 text-center',
        tone === 'outlined' && 'rounded-2xl border border-dashed border-rule-strong',
        className,
      )}
    >
      {Icon && (
        <Icon className="mx-auto mb-3 size-7 text-ink-faint" aria-hidden="true" />
      )}
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        {body}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
