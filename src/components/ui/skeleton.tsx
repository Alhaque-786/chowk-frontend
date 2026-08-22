import { cn } from '@/lib/cn'

/**
 * A loading placeholder.
 *
 * Sized by the caller to match the real content it stands in for, so the layout
 * does not jump when data arrives — a menu that reflows on load makes people tap
 * the wrong dish. Pulse is disabled under prefers-reduced-motion by globals.css.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-sm bg-surface-sunk', className)}
      aria-hidden="true"
    />
  )
}
