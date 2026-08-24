/**
 * The app's view of the shared design tokens.
 *
 * THE VALUES ARE NOT HERE. They live in packages/tokens, shared with the web app and
 * (when it exists) the driver app. This file previously held its own copy, hand
 * transcribed from the web app's CSS, and within a day eleven of the nineteen shared
 * colours had drifted apart — `accent`, `veg`, `non-veg`, all four inks and more.
 * Nothing failed, which is exactly why it went unnoticed.
 *
 * What this file legitimately still does is ADAPT. Short aliases (`c`, `s`) are kept
 * because they are used at nearly every call site in the app and `color.inkSoft`
 * reads worse than `c.inkSoft` inside a StyleSheet. And the native shadow objects
 * cannot be shared as CSS strings, so the package exports both forms from one tint.
 */
import {
  color,
  gradient,
  motion,
  radius as sharedRadius,
  shadowNative,
  space,
} from '@chowk/tokens'

export const c = color
export const s = space
export const gradients = gradient

/*
  The full shared ladder, including the two steps the app did not previously have
  (`xs` at 6px and `xxl` at 28px). Every step the app already used keeps its exact
  value — sm 8, md 12, lg 16, xl 20 — so nothing on screen moves.
*/
export const radius = sharedRadius

/*
  iOS takes the four shadow props; Android honours only `elevation`. Both are set in
  the package and neither is redundant.
*/
export const shadow = shadowNative

export const spring = motion.spring
export const duration = motion.duration
