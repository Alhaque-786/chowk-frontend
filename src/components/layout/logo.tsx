import { cn } from '@/lib/cn'

/**
 * The mark: four quadrants around a crossing.
 *
 * A chowk is a crossroads — the square where four streets meet and the market
 * happens. The mark is that intersection rather than a plate or a chef's hat,
 * which is what every food app reaches for.
 *
 * currentColor throughout, so it inherits the brand token and works on either
 * theme without a second asset.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('text-brand', className)}
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="8.5" height="8.5" rx="2" fill="currentColor" />
      <rect x="13.5" y="2" width="8.5" height="8.5" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="2" y="13.5" width="8.5" height="8.5" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="13.5" y="13.5" width="8.5" height="8.5" rx="2" fill="currentColor" />
    </svg>
  )
}
