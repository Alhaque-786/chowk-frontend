import { Badge } from '@/components/ui/badge'
import { formatEta, formatRupees } from '@/lib/format'
import type { Kitchen } from '@/lib/api/types'

export function KitchenHeader({ kitchen }: { kitchen: Kitchen }) {
  return (
    <header className="border-b border-rule bg-surface px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold leading-tight text-ink">
              {kitchen.name}
            </h1>
            {kitchen.cuisines.length > 0 && (
              <p className="mt-1 text-sm text-ink-soft">
                {kitchen.cuisines.join(' · ')}
              </p>
            )}
          </div>

          {/* Closed state is stated prominently rather than discovered at
              checkout, and it carries the REASON — "closed until 11am" is
              actionable where "unavailable" is not. */}
          {kitchen.is_open ? (
            <Badge tone="success">Open</Badge>
          ) : (
            <Badge tone="danger">Closed</Badge>
          )}
        </div>

        {!kitchen.is_open && kitchen.closed_reason && (
          <p className="mt-3 rounded-[--radius] bg-danger-soft px-3 py-2 text-sm text-danger">
            {kitchen.closed_reason}
          </p>
        )}

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {kitchen.rating_count > 0 && (
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Rating</dt>
              <dd className="font-semibold text-ink tabular">
                ★ {kitchen.rating_average.toFixed(1)}
              </dd>
              <span className="text-xs text-ink-faint tabular">
                ({kitchen.rating_count})
              </span>
            </div>
          )}
          <div className="flex items-baseline gap-1.5">
            <dt className="text-ink-faint">Ready in</dt>
            <dd className="font-medium text-ink">{formatEta(kitchen.avg_prep_minutes)}</dd>
          </div>
          {kitchen.min_order_minor > 0 && (
            <div className="flex items-baseline gap-1.5">
              <dt className="text-ink-faint">Minimum</dt>
              <dd className="font-medium text-ink tabular">
                {formatRupees(kitchen.min_order_minor)}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </header>
  )
}
