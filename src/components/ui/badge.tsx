import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-sunk text-ink-soft',
  brand: 'bg-brand-soft text-brand',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-surface-sunk text-success',
  warning: 'bg-accent-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

/**
 * A small status or offer label.
 *
 * Tone is semantic rather than a colour name, so a caller picks meaning and the
 * palette decides how that looks. Passing "green" would couple every call site
 * to the current theme.
 */
export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5',
        'text-[0.6875rem] font-medium tracking-wide',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
