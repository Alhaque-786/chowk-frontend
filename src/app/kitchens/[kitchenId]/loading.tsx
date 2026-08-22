import { Skeleton } from '@/components/ui/skeleton'

/**
 * Streamed while the menu loads.
 *
 * The shapes match the real content's dimensions so the layout does not jump
 * when data arrives — a menu that reflows on load makes people tap the wrong
 * dish, which is worse than a slightly longer blank.
 */
export default function Loading() {
  return (
    <div className="pb-24">
      <div className="border-b border-rule bg-surface px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
          <div className="mt-4 flex gap-6">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <Skeleton className="mt-7 h-6 w-28" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 border-b border-rule py-4">
            <div className="flex-1">
              <Skeleton className="h-3.5 w-3.5" />
              <Skeleton className="mt-1.5 h-5 w-2/3" />
              <Skeleton className="mt-1.5 h-4 w-20" />
              <Skeleton className="mt-2 h-3.5 w-full" />
              <Skeleton className="mt-1 h-3.5 w-4/5" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
