/**
 * A continuously scrolling ribbon of what the kitchens actually cook.
 *
 * Purely atmospheric, and honest about it: it sets a register of variety in one
 * glance where a static list of the same words would read as filler. The track
 * holds the list TWICE and translates by exactly -50%, which is what makes the
 * loop seamless -- at the animation's end the second copy sits precisely where
 * the first started, so there is no visible jump to hide.
 *
 * aria-hidden, and the CSS drops the animation under prefers-reduced-motion, so
 * it is neither read out nor a vestibular problem.
 */

const DISHES = [
  'Biryani', 'Galouti Kebab', 'Butter Chicken', 'Chole Bhature', 'Dal Makhani',
  'Tandoori Roti', 'Rogan Josh', 'Paneer Tikka', 'Nihari', 'Korma',
  'Sheermal', 'Malai Kofta', 'Kulcha', 'Phirni', 'Shami Kebab',
]

export function CuisineMarquee() {
  return (
    <div className="edge-fade overflow-hidden border-y border-rule bg-surface py-3" aria-hidden="true">
      <div className="marquee-track gap-3">
        {/* Two copies, deliberately. See the note above on -50%. */}
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 gap-3 pr-3">
            {DISHES.map((dish) => (
              <span
                key={dish}
                className="whitespace-nowrap rounded-full bg-surface-sunk px-4 py-1.5 font-display text-sm font-semibold text-ink-soft ring-1 ring-rule/60"
              >
                {dish}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
