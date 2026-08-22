import { cn } from '@/lib/cn'
import type { FoodType } from '@/lib/api/types'

/**
 * The veg / non-veg mark.
 *
 * This is a LEGAL labelling requirement in India under FSSAI rules, not a
 * stylistic choice: a green dot in a green square for vegetarian, brown/red
 * triangle in a square for non-vegetarian. It must appear next to every item.
 *
 * That is why the colour comes from a semantic token (--veg / --non-veg) and not
 * from the brand palette. If the brand ever changes, this must not.
 */
export function FoodMark({
  type,
  className,
}: {
  type: FoodType
  className?: string
}) {
  const config: Record<FoodType, { color: string; label: string; round: boolean }> = {
    veg: { color: 'border-veg', label: 'Vegetarian', round: true },
    vegan: { color: 'border-veg', label: 'Vegan', round: true },
    // Egg is labelled distinctly in practice; many customers treat it as neither.
    egg: { color: 'border-egg', label: 'Contains egg', round: true },
    non_veg: { color: 'border-non-veg', label: 'Non-vegetarian', round: false },
  }
  const { color, label, round } = config[type]

  return (
    <span
      className={cn('inline-flex size-3.5 shrink-0 items-center justify-center border', color, className)}
      // The mark is meaningful, so it needs an accessible name rather than being
      // hidden as decoration.
      role="img"
      aria-label={label}
      title={label}
    >
      <span
        className={cn(
          'size-1.5',
          round ? 'rounded-full' : 'clip-triangle',
          type === 'non_veg' ? 'bg-non-veg' : type === 'egg' ? 'bg-egg' : 'bg-veg',
        )}
      />
    </span>
  )
}
