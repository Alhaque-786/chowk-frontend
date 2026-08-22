/**
 * The ground colour in each theme, duplicated from globals.css.
 *
 * Duplicated because it has to be: the browser reads `theme-color` from a meta
 * tag before any stylesheet is parsed, so it cannot reference a CSS variable.
 * Keeping the two values here — named, in one file, next to the reason — means a
 * palette change has exactly one other place to update, rather than a raw hex
 * buried in layout.tsx that nobody connects to the tokens.
 *
 * This colour paints the browser chrome on mobile, so a mismatch shows up as a
 * visible seam above the page.
 */
export const THEME_GROUND = {
  light: '#fbf9f5',
  dark: '#14120f',
} as const
