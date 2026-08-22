import { Star, Timer } from 'lucide-react'
import { DishImage } from '@/components/ui/dish-image'

/**
 * The hero's visual anchor: three dish cards floating in real perspective.
 *
 * WHY THIS EXISTS. Every reference the big apps set -- Zomato, Swiggy, magicpin
 * -- carries its hero on photography. We have no dish photographs yet, so a
 * single flat image slot would be an empty grey rectangle in the most important
 * position on the site. Instead of faking one big photo, this leans the other
 * way: a small composed group, tilted in a shared 3D scene, where the interest
 * comes from depth and arrangement rather than from image content. It is the one
 * treatment that looks deliberate while the photography is still missing, and it
 * swaps straight over -- DishImage already prefers `src` when a dish has one, so
 * these become real photographs the moment the menu carries them.
 *
 * Decorative as a whole: the cards repeat what the kitchen list below states in
 * text, so the group is hidden from assistive tech rather than read out twice.
 */

/** Illustrative cards. Not fetched: this is hero art, and it must paint with the
 *  static shell for LCP rather than waiting on a query. */
const CARDS = [
  {
    name: 'Lucknawi Mutton Biryani',
    kitchen: 'Khansama',
    price: '₹320',
    rating: '4.7',
    mins: '28',
    // Tailwind cannot express a rotate on two axes plus a Z translate, and this
    // is genuinely one composed transform per card rather than a reusable scale.
    transform: 'rotateY(-14deg) rotateX(6deg) translateZ(60px)',
    float: 'float-slow',
    position: 'left-0 top-6 w-[62%]',
    z: 'z-30',
  },
  {
    name: 'Galouti Kebab Platter',
    kitchen: 'Khansama',
    price: '₹240',
    rating: '4.8',
    mins: '22',
    transform: 'rotateY(-10deg) rotateX(4deg) translateZ(10px)',
    float: 'float-mid',
    position: 'right-0 top-0 w-[54%]',
    z: 'z-20',
  },
  {
    name: 'Shahi Paneer Thali',
    kitchen: 'Khansama',
    price: '₹190',
    rating: '4.6',
    mins: '25',
    transform: 'rotateY(-8deg) rotateX(3deg) translateZ(-30px)',
    float: 'float-fast',
    position: 'bottom-0 right-8 w-[50%]',
    z: 'z-10',
  },
]

export function HeroStack() {
  return (
    <div
      className="scene-3d relative mx-auto aspect-[4/5] w-full max-w-md sm:aspect-[5/6]"
      aria-hidden="true"
    >
      {CARDS.map((card) => (
        <div
          key={card.name}
          className={`absolute ${card.position} ${card.z} ${card.float}`}
        >
          <div
            className="card-3d overflow-hidden rounded-3xl bg-surface p-2 shadow-float ring-1 ring-white/60"
            style={{ transform: card.transform }}
          >
            <DishImage
              name={card.name}
              className="aspect-[4/3] w-full rounded-2xl"
              sizes="240px"
            />
            <div className="px-2 pb-1 pt-2.5">
              <p className="truncate font-display text-sm font-bold leading-tight text-ink">
                {card.name}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-[0.7rem] text-ink-soft">
                <span className="tabular font-semibold text-ink">{card.price}</span>
                <span className="text-ink-faint">·</span>
                <span className="inline-flex items-center gap-0.5">
                  <Star className="size-3 fill-veg text-veg" />
                  <span className="tabular">{card.rating}</span>
                </span>
                <span className="text-ink-faint">·</span>
                <span className="inline-flex items-center gap-0.5">
                  <Timer className="size-3" />
                  <span className="tabular">{card.mins}m</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
