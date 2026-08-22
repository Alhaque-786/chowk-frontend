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
 */
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
