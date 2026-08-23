'use client'

import { motion, useReducedMotion } from 'motion/react'

/**
 * Reveals its children as they scroll into view.
 *
 * Deliberately restrained: 12px of travel and a short fade. The point is to make
 * a long scroll feel responsive, not to animate. Anything larger becomes the
 * thing you notice instead of the food, and on a list of twenty kitchens an
 * elaborate entrance is actively annoying by the fifth.
 *
 * `useReducedMotion` is checked rather than relying on the CSS media query alone,
 * because these transforms are driven by JS and would otherwise ignore the
 * preference entirely. For someone with vestibular sensitivity, that is the
 * difference between usable and not.
 *
 * NO-JS SAFETY. The server renders `initial`, so the markup ships as
 * `opacity: 0` and only becomes visible once motion hydrates and the viewport
 * observer fires. With JavaScript unavailable or broken, five sections of the
 * home page were permanently invisible -- present in the DOM, readable by a
 * crawler, and blank to a person. The `<noscript>` rule below forces them back
 * to visible, which is three lines and cannot regress: if JS runs, the element
 * is never affected; if it does not, the animation was never going to happen
 * anyway.
 */

/**
 * Rendered ONCE, not per Reveal. A style tag inside the component would emit one
 * copy per instance -- five on the home page today, more later.
 *
 * Lives in the layout so it is present before any Reveal renders. `!important`
 * because it is overriding an inline style, which nothing else can outrank.
 */
export function RevealNoScriptFallback() {
  return (
    <noscript>
      <style>{`
        [data-reveal] { opacity: 1 !important; transform: none !important; }
      `}</style>
    </noscript>
  )
}
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  /** Stagger within a group. Keep small — cumulative delay reads as lag. */
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()

  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      // Hook for the no-script fallback above.
      data-reveal=""
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      // `once` so scrolling back up does not replay it, which reads as a glitch.
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Press feedback for tappable cards.
 *
 * A slight scale on tap is the cheapest way to make a web app feel native: it
 * confirms the touch landed before the navigation resolves, which is otherwise a
 * dead moment on a slow connection.
 */
export function Pressable({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()

  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.12 }}
    >
      {children}
    </motion.div>
  )
}
