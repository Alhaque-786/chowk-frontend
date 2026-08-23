import Image from 'next/image'
import { cn } from '@/lib/cn'

/**
 * A dish image, with a DESIGNED fallback for the (currently usual) case of no
 * photograph.
 *
 * This component exists because photography is ~70% of the visual weight of any
 * food app, and we have none. A grey box would make the whole product look
 * broken; an obviously-intentional tile does not. The fallback derives a warm
 * gradient deterministically from the dish name, so the same dish always looks
 * the same and a menu reads as a designed set rather than random noise.
 *
 * The photograph path is now the normal one -- menu_items.image_url and
 * kitchens.cover_image_url are both populated -- so the gradient is the exception
 * rather than the rule. It stays because it must: a drink with no photo, a newly
 * added dish, and a kitchen that has not uploaded a cover all still need to
 * render as something designed.
 */

/** Warm, food-adjacent gradient pairs. Deliberately none of them grey. */
const PALETTES: Array<[string, string]> = [
  ['#F5C77E', '#E08A3C'], // turmeric → marigold
  ['#E9A17C', '#C2542C'], // paprika → chilli
  ['#CBD9A3', '#7F9A4E'], // coriander → curry leaf
  ['#F0CBA8', '#C98B4B'], // besan → jaggery
  ['#E4B7B2', '#B5625C'], // tandoori → rogan
  ['#D9C7A0', '#A78B5A'], // sesame → cardamom
  ['#B9CFC4', '#6E9483'], // mint → pudina
  ['#EFD9A0', '#C9A227'], // saffron → haldi
]

/** A stable hash, so the same dish always gets the same tile. */
function paletteFor(seed: string): [string, string] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return PALETTES[Math.abs(hash) % PALETTES.length]
}

/** The dish's initials, as the tile's focal point. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '·'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function DishImage({
  name,
  src,
  className,
  sizes = '(max-width: 640px) 33vw, 160px',
  priority = false,
}: {
  name: string
  src?: string
  className?: string
  sizes?: string
  priority?: boolean
}) {
  if (src) {
    return (
      <div className={cn('relative overflow-hidden bg-surface-sunk', className)}>
        <Image
          src={src}
          alt={name}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
        {/* A gentle bottom scrim, so overlaid text stays legible on any photo
            without dimming the food itself. */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent"
          aria-hidden="true"
        />
      </div>
    )
  }

  const [from, to] = paletteFor(name)

  return (
    <div
      className={cn(
        'relative grid place-items-center overflow-hidden',
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
      // Decorative: the dish name is always adjacent in the DOM, so announcing
      // initials would just repeat it.
      aria-hidden="true"
    >
      {/* A faint concentric ring, echoing a thali rim. Enough texture that the
          tile does not read as a flat colour swatch. */}
      <svg className="absolute inset-0 size-full opacity-[0.18]" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="34" fill="none" stroke="white" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="26" fill="none" stroke="white" strokeWidth="0.6" />
      </svg>
      <span className="relative font-display text-lg font-extrabold tracking-tight text-white/85">
        {initials(name)}
      </span>
    </div>
  )
}
