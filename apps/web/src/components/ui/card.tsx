import { cn } from '@/lib/cn'

export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'article' | 'li' | 'section'
}) {
  return (
    <As
      className={cn(
        'rounded-2xl border border-rule bg-surface shadow-sm',
        className,
      )}
    >
      {children}
    </As>
  )
}
